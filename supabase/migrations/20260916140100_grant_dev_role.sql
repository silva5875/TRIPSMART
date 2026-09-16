-- Marca sua própria conta com a etiqueta "Dev responsável" na aba Usuários.
-- Rode DEPOIS de 20260916140000_add_dev_role.sql (numa segunda execução —
-- ver o comentário daquele arquivo sobre por quê).
--
-- Só concede a etiqueta em si; seu acesso de admin já veio de uma concessão
-- anterior e não muda aqui.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'dev' FROM auth.users WHERE email = 'adonai5875@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
