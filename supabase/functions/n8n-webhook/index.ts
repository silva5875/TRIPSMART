import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Use /webhook-test/ para testar no editor do n8n (workflow NÃO precisa estar ativo)
// Use /webhook/ para produção (workflow PRECISA estar ativo via toggle no canto superior direito)
const N8N_BASE_URL = Deno.env.get("N8N_WEBHOOK_URL") || "https://n8n.grupounibra.com/webhook";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lista única — alimenta o enum de validação E o mapa de rotas abaixo, para
// as duas coisas nunca discordarem sobre quais ações existem.
const ACTIONS = [
  "get-tourist-spots",
  "get-accommodations",
  "get-restaurants",
  "get-transport-prices",
  "generate-itinerary",
] as const;

const webhookPaths: Record<(typeof ACTIONS)[number], string> = {
  "get-tourist-spots": "/get-tourist-spots",
  "get-accommodations": "/get-accommodations",
  "get-restaurants": "/get-restaurants",
  "get-transport-prices": "/get-transport-prices",
  "generate-itinerary": "/generate-itinerary",
};

/**
 * Formatos de `params` — espelham exatamente o que src/data/catalog/index.ts
 * manda hoje (ver `contextPayload`, `useAccommodations`, `generateItinerary`).
 * `get-restaurants` e `get-transport-prices` estão na tabela de rotas mas
 * nenhuma tela os chama ainda — corpo permissivo de propósito, para não
 * travar uma integração futura com um formato que eu só estaria adivinhando.
 */
const SpotInputSchema = z.object({
  name: z.string().min(1).max(200),
  lat: z.number(),
  lng: z.number(),
  category: z.string().max(50).optional(),
});

const ContextParamsSchema = z.object({
  city: z.string().min(1).max(100),
  cityName: z.string().min(1).max(100),
  budget: z.number().nonnegative(),
  budgetLabel: z.string().max(100),
  people: z.number().int().positive().max(50),
  days: z.number().int().positive().max(60),
  month: z.number().int().min(1).max(12).nullable(),
  transportToDestination: z.string().max(100).nullable(),
});

const GenerateItineraryParamsSchema = z.object({
  budget: z.number().nonnegative(),
  budgetLabel: z.string().max(100),
  people: z.number().int().positive().max(50),
  adults: z.number().int().positive().max(50),
  children: z.number().int().nonnegative().max(50),
  isCouple: z.boolean(),
  rooms: z.number().int().positive().max(20),
  days: z.number().int().positive().max(60),
  month: z.number().int().min(1).max(12).nullable(),
  transportToDestination: z.string().max(100).nullable(),
  city: z.string().min(1).max(100),
  selectedSpots: z.array(SpotInputSchema).max(60),
  accommodation: z
    .object({ name: z.string().min(1).max(200), lat: z.number(), lng: z.number() })
    .nullable(),
  localTransport: z.string().max(100).nullable(),
  preferences: z.unknown().optional(),
});

const ACTION_PARAM_SCHEMAS: Record<(typeof ACTIONS)[number], z.ZodType> = {
  "get-tourist-spots": ContextParamsSchema,
  "get-accommodations": ContextParamsSchema.extend({ spots: z.array(SpotInputSchema).max(60) }),
  "get-restaurants": z.record(z.unknown()),
  "get-transport-prices": z.record(z.unknown()),
  "generate-itinerary": GenerateItineraryParamsSchema,
};

const RequestEnvelopeSchema = z.object({
  action: z.enum(ACTIONS),
  params: z.record(z.unknown()),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const envelope = RequestEnvelopeSchema.safeParse(rawBody);
    if (!envelope.success) {
      return jsonResponse(
        { success: false, error: `Ação ou parâmetros inválidos: ${envelope.error.issues[0]?.message}` },
        400
      );
    }
    const { action, params: rawParams } = envelope.data;

    const paramsResult = ACTION_PARAM_SCHEMAS[action].safeParse(rawParams);
    if (!paramsResult.success) {
      const issue = paramsResult.error.issues[0];
      return jsonResponse(
        {
          success: false,
          error: `Parâmetros inválidos para "${action}"${issue ? ` (${issue.path.join(".")}: ${issue.message})` : ""}`,
        },
        400
      );
    }
    const params = paramsResult.data;

    const webhookUrl = `${N8N_BASE_URL}${webhookPaths[action]}`;
    console.log(`Calling n8n webhook: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`n8n webhook failed [${response.status}]: ${errorBody}`);
    }

    // O n8n já respondeu HTTP 200 mais de uma vez com o corpo vazio (nó
    // "Respond to Webhook" ausente ou mal configurado no workflow) —
    // `response.json()` direto nesse caso lança "Unexpected end of JSON
    // input", uma mensagem que não diz nada a quem está do outro lado.
    const rawText = await response.text();
    let data: unknown;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(
        `O n8n devolveu uma resposta que não é JSON válido para a ação "${action}". Verifique os logs de execução do workflow.`
      );
    }
    if (data === null) {
      throw new Error(
        `O n8n não devolveu nenhum dado para a ação "${action}" (corpo vazio). Verifique se o workflow tem um nó "Respond to Webhook" configurado corretamente.`
      );
    }

    return jsonResponse({ success: true, data }, 200);
  } catch (error: unknown) {
    console.error("n8n webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
