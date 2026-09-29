-- Integração de pagamento (Stripe) — checkout hospedado, sem cartão passando
-- pelo TripSmart. As edge functions create-checkout-session/create-portal-session/
-- stripe-webhook são quem de fato fala com o Stripe; isto aqui é só o que elas
-- precisam para guardar e consultar o estado da assinatura.

ALTER TABLE public.plans
  ADD COLUMN stripe_price_id text;

-- Tabela própria — NÃO em profiles. profiles é legível por qualquer usuário
-- autenticado de propósito (ver migration de dtnascimento); stripe_customer_id
-- e stripe_subscription_id não deveriam ser dado público de mais ninguém.
-- Só a service_role escreve aqui (a edge function stripe-webhook) — por isso
-- não existe política de INSERT/UPDATE para authenticated.
CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'incomplete',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê a própria assinatura"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
