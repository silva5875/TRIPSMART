import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import Stripe from "https://esm.sh/stripe@22.6.2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      throw new Error("SITE_URL não configurado — necessário para a URL de retorno do Portal.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Missing Authorization header" }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return jsonResponse({ success: false, error: "not authorized" }, 401);

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: subscription, error: subError } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subError) throw subError;
    if (!subscription?.stripe_customer_id) {
      return jsonResponse({ success: false, error: "Você ainda não tem uma assinatura para gerenciar." }, 400);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${SITE_URL}perfil`,
    });

    return jsonResponse({ success: true, data: { url: portalSession.url } }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
