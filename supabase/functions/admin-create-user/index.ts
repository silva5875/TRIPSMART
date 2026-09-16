import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mantida em sincronia manual com src/lib/validation.ts — os dois runtimes
// (browser e Deno) não compartilham módulo, então a regra vive duplicada.
const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

// Mesma lógica de src/lib/validation.ts#isAtLeast18, duplicada pelo mesmo
// motivo. A garantia de verdade é a constraint dtnascimento_idade_minima_18
// no banco; isto é só para devolver um erro legível antes de tentar o insert.
// Parse manual (não `new Date(dateStr)`) para não misturar UTC com o
// relógio local do runtime que roda a função — ver comentário completo no
// arquivo original.
function isAtLeast18(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const [, y, m, d] = match;
  const year = Number(y);
  const monthIndex = Number(m) - 1;
  const day = Number(d);

  const birth = new Date(year, monthIndex, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== monthIndex || birth.getDate() !== day) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}

interface CreateUserPayload {
  email?: string;
  password?: string;
  displayName?: string;
  birthDate?: string;
  role?: "admin" | "user";
}

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

  try {
    // Cliente "como o chamador": repassa o Authorization recebido, então
    // is_admin() enxerga o mesmo auth.uid() que a sessão do navegador tem.
    // É essa checagem — não o botão escondido na tela — que decide se o
    // pedido é aceito.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Missing Authorization header" }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdminResult, error: isAdminError } = await callerClient.rpc("is_admin");
    if (isAdminError || isAdminResult !== true) {
      return jsonResponse({ success: false, error: "not authorized" }, 403);
    }

    const payload: CreateUserPayload = await req.json();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password ?? "";
    const displayName = payload.displayName?.trim() || null;
    const birthDate = payload.birthDate?.trim() || "";
    const role = payload.role === "admin" ? "admin" : "user";

    if (!email || !email.includes("@")) {
      return jsonResponse({ success: false, error: "Email inválido" }, 400);
    }
    if (!PASSWORD_REGEX.test(password)) {
      return jsonResponse(
        { success: false, error: "A senha precisa ter 8+ caracteres, 1 maiúscula, 1 número e 1 caractere especial" },
        400
      );
    }
    if (!birthDate || !isAtLeast18(birthDate)) {
      return jsonResponse(
        { success: false, error: "Data de nascimento inválida ou usuário com menos de 18 anos" },
        400
      );
    }

    // Só a partir daqui usa o service role — a checagem de admin já passou
    // com o client "como o chamador", acima.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // o admin está vouching pela conta — não faz sentido exigir confirmação por email
      user_metadata: displayName ? { full_name: displayName } : undefined,
    });

    if (createError || !created.user) {
      return jsonResponse({ success: false, error: createError?.message ?? "Falha ao criar usuário" }, 400);
    }

    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: created.user.id, role }, { onConflict: "user_id,role" });

    if (roleError) {
      // A conta já existe nesse ponto; não desfazemos a criação por uma falha
      // ao gravar o papel — melhor um usuário sem o papel certo (corrigível
      // depois na aba Usuários) do que uma conta órfã sem dono.
      return jsonResponse(
        {
          success: false,
          error: `Usuário criado, mas falha ao definir o papel: ${roleError.message}`,
        },
        207
      );
    }

    const { error: birthDateError } = await adminClient
      .from("dtnascimento")
      .insert({ user_id: created.user.id, birth_date: birthDate });

    if (birthDateError) {
      return jsonResponse(
        {
          success: false,
          error: `Usuário criado, mas falha ao gravar a data de nascimento: ${birthDateError.message}`,
        },
        207
      );
    }

    return jsonResponse({ success: true, data: { id: created.user.id, email: created.user.email } }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
