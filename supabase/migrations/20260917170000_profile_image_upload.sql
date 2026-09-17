-- Upload de foto de perfil de verdade (arquivo, não mais só URL colada).
--
-- `imagem_perfil` guarda o caminho do objeto no Storage, no formato
-- "<user_id>/<hash-sha256-do-arquivo>.<ext>" — o hash como nome evita
-- duplicar a mesma imagem enviada de novo (upsert sobrescreve o mesmo
-- caminho) e funciona como cache-buster natural quando a foto muda de
-- verdade (o hash muda junto). `avatar_url` (texto livre, nunca teve upload
-- de fato) continua existindo sem uso nesta tela a partir de agora.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS imagem_perfil text;

-- Bucket público: a foto de perfil é para ser vista pelo resto do app
-- (como avatar_url já era, em tese). Só o dono (auth.uid()) pode enviar,
-- substituir ou apagar dentro da própria pasta.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Qualquer um pode ver avatares"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Usuário envia seu próprio avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Usuário substitui seu próprio avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Usuário apaga seu próprio avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
