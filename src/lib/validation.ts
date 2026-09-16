/**
 * Regra de senha do app: 8+ caracteres, 1 maiúscula, 1 número, 1 caractere
 * especial. Usada em Auth.tsx, ResetPassword.tsx e no formulário de criação
 * de usuário do admin — extraída aqui para as três não divergirem.
 *
 * A edge function admin-create-user roda em Deno, runtime separado que não
 * importa deste arquivo; ela mantém uma cópia própria, comentada para
 * apontar de volta para cá.
 */
export const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const PASSWORD_REQUIREMENTS_TEXT =
  'A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.';

/**
 * Checagem de 18+ no cliente — é conveniência de UX (feedback rápido antes de
 * enviar), não a garantia real. Essa vive na constraint
 * `dtnascimento_idade_minima_18` no banco, e a edge function
 * admin-create-user mantém uma cópia própria desta mesma lógica (Deno não
 * importa deste arquivo).
 *
 * `dateStr` precisa ser "YYYY-MM-DD" (o que <input type="date"> sempre
 * produz) e é interpretado como data LOCAL, de propósito: `new Date(dateStr)`
 * lê uma string só-de-data como UTC meia-noite, enquanto "hoje" abaixo é
 * local — misturar os dois pode deslocar a fronteira dos 18 anos em até um
 * dia dependendo do fuso de quem roda isto (não é hipotético: foi pego por um
 * teste rodando num fuso a oeste de UTC).
 */
export function isAtLeast18(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const [, y, m, d] = match;
  const year = Number(y);
  const monthIndex = Number(m) - 1;
  const day = Number(d);

  const birth = new Date(year, monthIndex, day);
  // Data que não existe (ex.: 2024-02-30) rola para o mês seguinte no
  // construtor; se o dia devolvido não bater o que veio na string, era inválida.
  if (birth.getFullYear() !== year || birth.getMonth() !== monthIndex || birth.getDate() !== day) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}

/**
 * Só http(s) pode ir para um `href` clicável. `bookingUrl`/links parecidos
 * vêm de resposta externa (o workflow n8n) e iam direto para `<a href>` sem
 * essa checagem — se a fonte de dados do n8n fosse comprometida e devolvesse
 * algo como `javascript:fetch(...)`, o clique executaria esse script na
 * sessão logada do usuário. `rel="noopener"` não protege contra isso, só
 * contra `window.opener`.
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
