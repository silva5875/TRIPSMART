-- Novo valor de app_role só para identificar visualmente a conta do
-- desenvolvedor responsável na aba Usuários — não concede nenhuma permissão
-- extra (quem decide acesso é 'admin', via is_admin(); 'dev' é só etiqueta).
--
-- Em arquivo separado de propósito: o Postgres não deixa usar um valor de
-- enum recém-adicionado na MESMA transação em que ele foi criado. Rode este
-- arquivo primeiro, sozinho, depois o de concessão
-- (20260916140100_grant_dev_role.sql) em uma segunda execução.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dev';
