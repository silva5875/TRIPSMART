-- Número de protocolo para cada viagem salva — uma referência curta e
-- sequencial que o usuário pode anotar/informar, ao contrário do UUID interno
-- (36 caracteres, impraticável de ditar ou digitar de cabeça).
--
-- Gerado pelo BANCO via sequence, nunca pelo cliente: assim é impossível
-- forjar ou repetir um número, e nem precisa mudar o código de insert — o
-- DEFAULT cuida disso sozinho, inclusive preenchendo as linhas que já
-- existem (nextval() é volátil, então o Postgres reescreve a tabela chamando
-- a função uma vez por linha, em vez de aplicar o mesmo valor a todas).

CREATE SEQUENCE IF NOT EXISTS public.travel_history_protocol_seq START WITH 1;

ALTER TABLE public.travel_history
  ADD COLUMN IF NOT EXISTS protocol_number BIGINT NOT NULL
    DEFAULT nextval('public.travel_history_protocol_seq');

ALTER TABLE public.travel_history
  ADD CONSTRAINT travel_history_protocol_number_unique UNIQUE (protocol_number);

-- Liga o ciclo de vida da sequence à coluna: se a coluna/tabela for dropada
-- um dia, a sequence é limpa junto em vez de ficar órfã.
ALTER SEQUENCE public.travel_history_protocol_seq OWNED BY public.travel_history.protocol_number;
