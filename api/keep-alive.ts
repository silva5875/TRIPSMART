// O plano grátis do Supabase pausa o projeto depois de 7 dias sem atividade.
// O cron da Vercel (vercel.json) chama esta rota uma vez por dia, e ela faz
// uma leitura de verdade no Postgres — uma requisição que não chega ao banco
// não conta como atividade.
export async function GET(request: Request) {
  // A Vercel manda `Authorization: Bearer <CRON_SECRET>` quando a variável
  // existe no projeto; sem ela configurada, a rota fica aberta (só lê uma
  // tabela pública, então o pior caso é alguém acordar o banco).
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return Response.json({ ok: false, error: 'VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY ausente' }, { status: 500 });
  }

  // `plans` é legível por anon (RLS), então a chave publicável basta.
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/plans?select=id&limit=1`, { headers: { apikey: key } });
  } catch (error) {
    // Projeto já pausado some do DNS: o ping não o reativa, só o painel do Supabase.
    console.error('keep-alive: Supabase inacessível', error);
    return Response.json({ ok: false, error: 'Supabase inacessível (projeto pausado?)' }, { status: 502 });
  }

  if (!res.ok) {
    console.error(`keep-alive: Supabase respondeu ${res.status}: ${await res.text()}`);
    return Response.json({ ok: false, status: res.status }, { status: 502 });
  }
  return Response.json({ ok: true, at: new Date().toISOString() });
}
