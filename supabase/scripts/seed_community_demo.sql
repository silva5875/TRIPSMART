-- Seed de demonstração: 4 usuários fictícios + 1 roteiro compartilhado cada
-- (aparecem na Comunidade, /comunidade).
--
-- O que este script faz:
--   1. Cria 4 contas em auth.users (inserção direta — não passa pelo fluxo de
--      cadastro normal, então não dispara nenhum email de boas-vindas).
--      Emails em @example.com (domínio reservado pela RFC 2606 para
--      documentação/exemplos — nunca entrega de verdade, sem risco de colidir
--      com um email real ou de mandar algo para alguém).
--   2. O trigger handle_new_user() já existente cuida sozinho de criar a
--      linha em public.profiles (com o nome de exibição), user_preferences e
--      user_registry — é o mesmo caminho de um cadastro real.
--   3. Insere 1 roteiro em public.shared_itineraries por usuário, com dados
--      de pontos turísticos reais (copiados de src/data/mockData.ts) para o
--      card da Comunidade ficar coerente com o resto do site.
--
-- Essas contas não têm senha utilizável (hash aleatório) — não servem para
-- login, só para aparecer como autoras dos roteiros na Comunidade.
--
-- Para desfazer tudo depois, rode:
--   DELETE FROM auth.users WHERE email LIKE '%.tripsmart@example.com';
-- (cascade já apaga profiles/shared_itineraries/etc. — ver ON DELETE CASCADE
-- nas tabelas envolvidas.)

DO $$
DECLARE
  v_instance_id uuid := (SELECT instance_id FROM auth.users LIMIT 1);
  v_juliana_id uuid;
  v_pedro_id uuid;
  v_camila_id uuid;
  v_rafael_id uuid;
BEGIN
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- 1) Juliana Ramos — Recife
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, gen_random_uuid(), 'authenticated', 'authenticated',
    'juliana.ramos.tripsmart@example.com',
    crypt(encode(gen_random_bytes(18), 'hex'), gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Juliana Ramos"}'::jsonb,
    now() - interval '6 days', now() - interval '6 days',
    '', '', '', ''
  ) RETURNING id INTO v_juliana_id;

  INSERT INTO public.shared_itineraries (
    user_id, title, description, budget, budget_label, people, days, group_type,
    month, transport_to_destination, city, city_name, selected_spots, local_transport,
    likes_count, created_at, updated_at
  ) VALUES (
    v_juliana_id,
    '4 dias em Recife',
    'Roteiro de 4 dias em Recife, PE · 2 adultos · 1 quarto · Casal · 3 atividades.',
    2200, 'Moderado', 2, 4, 'couple', 12, 'aviao', 'recife', 'Recife',
    '[
      {"id":"marco-zero","name":"Marco Zero","description":"Praça principal do Recife Antigo com esculturas e eventos culturais.","peakMonths":[2,6,7,12],"rating":4.5,"lat":-8.0631,"lng":-34.8711,"iconKey":"Landmark","avgCostPerPerson":0,"category":"cultura","imageUrl":"https://dynamic-media-cdn.tripadvisor.com/media/photo-o/18/00/2e/31/recife.jpg?w=1200&h=-1&s=1"},
      {"id":"praia-boa-viagem","name":"Praia de Boa Viagem","description":"Praia urbana mais famosa do Recife com recifes naturais.","peakMonths":[10,11,12,1,2],"rating":4.3,"lat":-8.1186,"lng":-34.8953,"iconKey":"Palmtree","avgCostPerPerson":0,"category":"praia","imageUrl":"https://www.viajali.com.br/wp-content/uploads/2020/04/praia-de-boa-viagem-0.jpg"},
      {"id":"instituto-brennand","name":"Instituto Ricardo Brennand","description":"Castelo medieval com acervo de armas e obras de arte.","peakMonths":[3,4,5,6,7,8,9,10,11],"rating":4.8,"lat":-8.0647,"lng":-34.9728,"iconKey":"Castle","avgCostPerPerson":30,"category":"cultura","imageUrl":"https://cdn.folhape.com.br/img/pc/1100/1/dn_arquivo/2020/09/foto-paloma-amorim-1.jpg"}
    ]'::jsonb,
    'taxi', 3, now() - interval '6 days', now() - interval '6 days'
  );

  -- 2) Pedro Albuquerque — Olinda
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, gen_random_uuid(), 'authenticated', 'authenticated',
    'pedro.albuquerque.tripsmart@example.com',
    crypt(encode(gen_random_bytes(18), 'hex'), gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pedro Albuquerque"}'::jsonb,
    now() - interval '4 days', now() - interval '4 days',
    '', '', '', ''
  ) RETURNING id INTO v_pedro_id;

  INSERT INTO public.shared_itineraries (
    user_id, title, description, budget, budget_label, people, days, group_type,
    month, transport_to_destination, city, city_name, selected_spots, local_transport,
    likes_count, created_at, updated_at
  ) VALUES (
    v_pedro_id,
    '3 dias em Olinda',
    'Roteiro de 3 dias em Olinda, PE · 1 adulto · 1 quarto · 3 atividades.',
    900, 'Econômico', 1, 3, 'solo', 2, 'onibus', 'olinda', 'Olinda',
    '[
      {"id":"se-olinda","name":"Alto da Sé","description":"Mirante com vista panorâmica de Olinda e Recife.","peakMonths":[2,6,7,12],"rating":4.6,"lat":-8.0136,"lng":-34.8556,"iconKey":"Church","avgCostPerPerson":0,"category":"turismo","imageUrl":"https://www.viagensecaminhos.com/wp-content/uploads/2014/06/alto-da-se-olinda.jpg"},
      {"id":"carnaval-olinda","name":"Ladeiras do Carnaval","description":"Percurso dos bonecos gigantes e frevos.","peakMonths":[2,3],"rating":4.9,"lat":-8.01,"lng":-34.85,"iconKey":"Drama","avgCostPerPerson":0,"category":"cultura","imageUrl":"https://cdn.folhape.com.br/img/pc/1100/1/dn_arquivo/2018/02/b9170fb2-a1a3-43dd-bd41-c625e6482316.jpg"},
      {"id":"quatro-cantos","name":"Quatro Cantos","description":"Cruzamento histórico com casarões coloniais e artesanato.","peakMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"rating":4.3,"lat":-8.0095,"lng":-34.851,"iconKey":"Home","avgCostPerPerson":0,"category":"cultura","imageUrl":"https://dynamic-media-cdn.tripadvisor.com/media/photo-o/07/36/6f/c4/quatro-cantos.jpg?w=1200&h=1200&s=1"}
    ]'::jsonb,
    'publico', 1, now() - interval '4 days', now() - interval '4 days'
  );

  -- 3) Camila Duarte — Praia de Calhetas, Ipojuca
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, gen_random_uuid(), 'authenticated', 'authenticated',
    'camila.duarte.tripsmart@example.com',
    crypt(encode(gen_random_bytes(18), 'hex'), gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Camila Duarte"}'::jsonb,
    now() - interval '2 days', now() - interval '2 days',
    '', '', '', ''
  ) RETURNING id INTO v_camila_id;

  INSERT INTO public.shared_itineraries (
    user_id, title, description, budget, budget_label, people, days, group_type,
    month, transport_to_destination, city, city_name, selected_spots, local_transport,
    likes_count, created_at, updated_at
  ) VALUES (
    v_camila_id,
    '5 dias em Ipojuca',
    'Roteiro de 5 dias em Ipojuca, PE · 3 adultos · 2 quartos · 3 atividades. A praia de Calhetas foi o ponto alto.',
    7500, 'Premium', 3, 5, 'friends', 11, 'carro', 'ipojuca', 'Ipojuca',
    '[
      {"id":"praia-calhetas","name":"Praia de Calhetas","description":"Piscinas naturais e falésias em uma das praias mais preservadas de Ipojuca.","peakMonths":[10,11,12,1,2],"rating":4.7,"lat":-8.4628,"lng":-35.0167,"iconKey":"Palmtree","avgCostPerPerson":0,"category":"praia"},
      {"id":"piscinas-calhetas","name":"Piscinas Naturais de Calhetas","description":"Piscinas de águas calmas e cristalinas, ideais para mergulho com snorkel.","peakMonths":[10,11,12,1,2],"rating":4.6,"lat":-8.4635,"lng":-35.018,"iconKey":"Fish","avgCostPerPerson":35,"category":"praia"},
      {"id":"mirante-falesias-calhetas","name":"Mirante das Falésias","description":"Vista panorâmica das falésias e do coqueiral ao entardecer.","peakMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"rating":4.5,"lat":-8.461,"lng":-35.015,"iconKey":"Mountain","avgCostPerPerson":0,"category":"turismo"}
    ]'::jsonb,
    'aluguel', 5, now() - interval '2 days', now() - interval '2 days'
  );

  -- 4) Rafael Lins — Porto de Galinhas
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, gen_random_uuid(), 'authenticated', 'authenticated',
    'rafael.lins.tripsmart@example.com',
    crypt(encode(gen_random_bytes(18), 'hex'), gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rafael Lins"}'::jsonb,
    now() - interval '1 day', now() - interval '1 day',
    '', '', '', ''
  ) RETURNING id INTO v_rafael_id;

  INSERT INTO public.shared_itineraries (
    user_id, title, description, budget, budget_label, people, days, group_type,
    month, transport_to_destination, city, city_name, selected_spots, local_transport,
    likes_count, created_at, updated_at
  ) VALUES (
    v_rafael_id,
    '4 dias em Porto de Galinhas',
    'Roteiro de 4 dias em Porto de Galinhas, PE · 2 adultos + 2 crianças · 2 quartos · 3 atividades.',
    2600, 'Moderado', 4, 4, 'friends', 1, 'carro', 'porto-galinhas', 'Porto de Galinhas',
    '[
      {"id":"piscinas-naturais-pg","name":"Piscinas Naturais","description":"Piscinas formadas por recifes com peixes coloridos.","peakMonths":[10,11,12,1,2],"rating":4.8,"lat":-8.501,"lng":-35.002,"iconKey":"Fish","avgCostPerPerson":40,"category":"praia","imageUrl":"https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=400"},
      {"id":"praia-muro-alto","name":"Praia de Muro Alto","description":"Praia com piscina natural de 2,5km e águas calmas.","peakMonths":[10,11,12,1,2,3],"rating":4.6,"lat":-8.425,"lng":-34.98,"iconKey":"Palmtree","avgCostPerPerson":0,"category":"praia"},
      {"id":"jangada-pg","name":"Passeio de Jangada","description":"Jangada até as piscinas naturais com guia.","peakMonths":[10,11,12,1,2],"rating":4.7,"lat":-8.5015,"lng":-35.003,"iconKey":"Sailboat","avgCostPerPerson":30,"category":"turismo"}
    ]'::jsonb,
    'taxi', 2, now() - interval '1 day', now() - interval '1 day'
  );
END $$;
