import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import Stripe from "https://esm.sh/stripe@22.6.2?target=deno";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CheckoutSchema = z.object({
  planId: z.enum(["mochileiro", "explorador"]),
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SITE_URL = Deno.env.get("SITE_URL");
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

  try {
    if (!SITE_URL) {
      throw new Error("SITE_URL não configurado — necessário para montar as URLs de retorno do Checkout.");
    }

    // Cliente "como o chamador": getUser() valida o JWT recebido e devolve o
    // usuário dono dele — é dele que precisamos (id + email), não só um
    // booleano de permissão como em admin-create-user.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Missing Authorization header" }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return jsonResponse({ success: false, error: "not authorized" }, 401);

    const rawPayload = await req.json();
    const parsedPayload = CheckoutSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return jsonResponse(
        { success: false, error: parsedPayload.error.issues[0]?.message ?? "Dados inválidos" },
        400
      );
    }
    const { planId } = parsedPayload.data;

    // Service role a partir daqui — a identidade do chamador já foi
    // confirmada acima via getUser().
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: plan, error: planError } = await adminClient
      .from("plans")
      .select("id, name, stripe_price_id")
      .eq("id", planId)
      .single();
    if (planError || !plan) return jsonResponse({ success: false, error: "Plano não encontrado" }, 404);
    if (!plan.stripe_price_id) {
      return jsonResponse(
        { success: false, error: `Plano ${plan.name} ainda não está configurado para pagamento.` },
        400
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Reaproveita o Customer já existente, se houver — cada usuário tem no
    // máximo um, garantido pelo UNIQUE em subscriptions.stripe_customer_id.
    const { data: existing } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    // Sem isto, quem já tem assinatura ativa e clica pra trocar de plano
    // criaria uma SEGUNDA assinatura no Stripe (cobrança duplicada) em vez
    // de trocar a existente — trocar/cancelar é o Customer Portal que faz,
    // com proração correta; Checkout é só pra quem ainda não assina nada.
    if (existing?.status === "active" || existing?.status === "trialing") {
      return jsonResponse(
        { success: false, error: "Você já tem uma assinatura ativa. Use \"Gerenciar assinatura\" para trocar de plano." },
        409
      );
    }

    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const { error: upsertError } = await adminClient
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
      if (upsertError) throw upsertError;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${SITE_URL}perfil?checkout=success`,
      cancel_url: `${SITE_URL}planos?checkout=cancelled`,
      // O webhook usa isto pra saber qual plano ativar e de quem, sem
      // precisar adivinhar a partir só do customer/subscription id.
      metadata: { plan_id: planId, supabase_user_id: user.id },
    });

    if (!session.url) throw new Error("Stripe não devolveu a URL do Checkout");

    return jsonResponse({ success: true, data: { url: session.url } }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
