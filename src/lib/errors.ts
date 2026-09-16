/**
 * Nenhuma tela deve exibir `error.message` cru para quem usa o app: mensagens
 * do Postgres ("PGRST204", "42501", nome de coluna), de parsing ("Unexpected
 * end of JSON input") ou de rede não dizem nada útil para o usuário — só para
 * quem está depurando. `getErrorMessage` sempre loga o erro original no
 * console (para isso) e devolve, para a tela, uma tradução conhecida de erro
 * comum do Supabase Auth ou o `fallback` específico da ação que o chamador
 * passou.
 */

const KNOWN_AUTH_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email ou senha incorretos.'],
  [/user already registered/i, 'Este email já está cadastrado. Tente entrar.'],
  [/email not confirmed/i, 'Confirme seu email antes de entrar — verifique sua caixa de entrada.'],
  [/new password should be different/i, 'A nova senha precisa ser diferente da atual.'],
  [/password should be at least/i, 'A senha é muito curta.'],
  [/for security purposes/i, 'Aguarde um momento antes de tentar novamente.'],
  [/rate limit/i, 'Muitas tentativas. Aguarde um momento e tente novamente.'],
  [/failed to fetch|networkerror|network request failed|load failed/i, 'Sem conexão com a internet. Verifique sua rede e tente novamente.'],
];

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  console.error(error);
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const known = KNOWN_AUTH_MESSAGES.find(([pattern]) => pattern.test(raw));
  return known ? known[1] : fallback;
}
