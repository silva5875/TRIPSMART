import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import Stripe from "https://esm.sh/stripe@22.6.2?target=deno";

/**
 * Sem verify_jwt: quem chama aqui é o Stripe, não o navegador — não existe
 * sessão do Supabase pra checar. A autenticidade vem da assinatura
 * (Stripe-Signature + STRIPE_WEBHOOK_SECRET), verificada abaixo. Ver
 * supabase/config.toml — se o deploy for pelo Dashboard (não CLI), esse
 * arquivo não vale, e "Enforce JWT verification" precisa ser desligado
 * manualmente nas configurações da função.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const stripe = new Stripe(STRIPE_SECRET_KEY);
// Necessário pra verificar a assinatura em Deno — usa a Web Crypto API no
// lugar dos módulos nativos do Node que o stripe-node usa por padrão.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function userIdForCustomer(customerId: string): Promise<string | null> {
  const { data } = await adminClient
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function planIdForPrice(priceId: string): Promise<string | null> {
  const { data } = await adminClient
    .from("plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data?.id ?? null;
}

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return new Response("Missing Stripe-Signature header", { status: 400 });

  // .text(), não .json(): a verificação da assinatura precisa do corpo
  // exatamente como o Stripe o enviou — já parseado, a assinatura não bate.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Assinatura inválida";
    console.error("Falha ao verificar assinatura do webhook:", message);
    return new Response(message, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!userId || !planId || !customerId || !subscriptionId) {
          console.error("checkout.session.completed sem metadata/ids esperados", session.id);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const { error: subError } = await adminClient
          .from("subscriptions")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (subError) throw subError;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update({ plan_id: planId })
          .eq("id", userId);
        if (profileError) throw profileError;
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const priceId = subscription.items.data[0]?.price.id;

        const userId = await userIdForCustomer(customerId);
        if (!userId) {
          console.error("customer.subscription.updated sem usuário correspondente", customerId);
          break;
        }

        const { error: subError } = await adminClient
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (subError) throw subError;

        // Upgrade/downgrade feito pelo próprio Customer Portal muda o price
        // sem passar por checkout.session.completed de novo — é aqui que o
        // plano no nosso lado precisa acompanhar.
        if (priceId) {
          const planId = await planIdForPrice(priceId);
          if (planId) {
            const { error: profileError } = await adminClient
              .from("profiles")
              .update({ plan_id: planId })
              .eq("id", userId);
            if (profileError) throw profileError;
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

        const userId = await userIdForCustomer(customerId);
        if (!userId) {
          console.error("customer.subscription.deleted sem usuário correspondente", customerId);
          break;
        }

        const { error: subError } = await adminClient
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (subError) throw subError;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update({ plan_id: "free" })
          .eq("id", userId);
        if (profileError) throw profileError;
        break;
      }

      default:
        // Outros eventos (invoice.paid, payment_intent.*, etc.) não mexem em
        // plano nenhum hoje — ignorados de propósito, não é omissão.
        break;
    }
  } catch (error: unknown) {
    // O Stripe reenvia automaticamente em caso de erro (não-2xx) — devolver
    // 500 aqui é o comportamento certo pra uma falha de verdade (ex: banco
    // fora do ar), não algo a esconder.
    console.error(`Erro ao processar evento ${event.type}:`, error);
    return new Response("Erro ao processar evento", { status: 500 });
  }

  return Response.json({ received: true });
});
