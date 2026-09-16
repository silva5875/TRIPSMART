import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cityName, cityId, days, month, budget, budgetLabel, people, groupType } = await req.json();

    if (!cityName || !days || !month || !budget) {
      return new Response(JSON.stringify({ error: "Missing required fields: cityName, days, month, budget" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const monthName = monthNames[month - 1] || "Janeiro";

    const isFestive = month === 2 || month === 6;
    const festiveContext = month === 2
      ? "É mês de Carnaval em Pernambuco! Inclua informações sobre blocos, programação carnavalesca e alertas de preços elevados (30-60% acima do normal)."
      : month === 6
      ? "É mês de São João em Pernambuco! Inclua informações sobre festas juninas, quadrilhas, forró e alertas de preços elevados (20-50% acima do normal)."
      : "";

    const systemPrompt = `Você é um guia turístico especialista em Pernambuco, Brasil. Você gera roteiros de viagem ricos, detalhados e culturalmente profundos no estilo de um guia de viagem editorial premium.

REGRAS IMPORTANTES:
- Retorne APENAS JSON válido, sem markdown, sem backticks, sem texto antes ou depois.
- Use coordenadas geográficas REAIS e PRECISAS para cada local mencionado.
- Inclua contexto histórico, arquitetônico e cultural real de cada atração.
- Inclua informações práticas como horários, preços, contatos quando relevante.
- Organize por "polos de atrações" (zonas/bairros) com itinerários recomendados.
- Cada itinerário deve ter passos sequenciais com tempos e meios de transporte.`;

    const userPrompt = `Gere um roteiro completo para ${cityName}, Pernambuco, para ${days} dias no mês de ${monthName}.
Perfil: ${people} pessoa(s), grupo tipo "${groupType}", orçamento "${budgetLabel}" (R$ ${budget}).
${isFestive ? festiveContext : ""}

Retorne um JSON com esta estrutura exata:
{
  "city": "${cityName}",
  "cityId": "${cityId}",
  "introduction": "Texto introdutório de 2-3 frases sobre a cidade e o que esperar com ${days} dias",
  "festiveAlert": ${isFestive ? `{ "name": "${month === 2 ? 'Carnaval' : 'São João'}", "description": "Descrição do impacto nos preços e dicas", "priceIncrease": "30-60%" }` : "null"},
  "days": [
    {
      "day": 1,
      "title": "Título do dia",
      "summary": "Resumo curto do dia",
      "activities": [
        {
          "time": "09:00",
          "period": "Manhã",
          "title": "Nome da atividade",
          "description": "Descrição detalhada com contexto histórico/cultural (3-5 frases)",
          "location": "Nome do local",
          "address": "Endereço completo",
          "lat": -8.0631,
          "lng": -34.8711,
          "estimatedCost": 0,
          "duration": "1h30",
          "transport": "Pegue um Uber" ou "Caminhe 10 min",
          "tips": "Dica prática opcional"
        }
      ]
    }
  ],
  "attractionZones": [
    {
      "name": "Nome do polo/bairro",
      "description": "Descrição rica com contexto histórico (5-10 frases)",
      "highlights": [
        {
          "name": "Nome da atração",
          "description": "Descrição detalhada com história e curiosidades (3-8 frases)",
          "lat": -8.0631,
          "lng": -34.8711,
          "practicalInfo": {
            "address": "Endereço",
            "hours": "Horário de funcionamento",
            "price": "Preço ou Gratuito",
            "phone": "Telefone opcional",
            "instagram": "@perfil opcional"
          }
        }
      ],
      "recommendedItinerary": {
        "title": "Itinerário recomendado: Nome",
        "arrivalTime": "Chegando às 13h",
        "steps": [
          "Pegue um Uber para o Marco Zero",
          "Visite a Sinagoga Kahal Zur Israel",
          "Faça uma boquinha no Café Bom Jesus"
        ]
      }
    }
  ],
  "practicalTips": [
    {
      "category": "Transporte",
      "tip": "Dica prática sobre transporte na cidade"
    }
  ],
  "estimatedTotalCost": 2500,
  "costBreakdown": {
    "accommodation": 800,
    "food": 600,
    "transport": 400,
    "activities": 500,
    "extras": 200
  }
}

IMPORTANTE: Gere conteúdo REAL e detalhado sobre ${cityName}. Use locais, restaurantes e atrações que realmente existem. Coordenadas devem ser precisas.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error [${response.status}]`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    // Parse JSON from response, handling potential markdown wrapping
    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI JSON:", content.substring(0, 500));
      throw new Error("Failed to parse itinerary data from AI");
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("generate-rich-itinerary error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
