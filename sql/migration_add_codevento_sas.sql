-- Migração para adicionar campo CODEVENTO_SAS na tabela events
-- Execute este SQL no Supabase para adicionar o campo que vai vincular eventos SAS com eventos locais

-- 1. Adicionar coluna codevento_sas na tabela events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS codevento_sas VARCHAR(50);

-- 2. Criar índice único para garantir que não haja duplicação de eventos SAS
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_codevento_sas 
ON events(codevento_sas) 
WHERE codevento_sas IS NOT NULL;

-- 3. Adicionar comentário na coluna para documentação
COMMENT ON COLUMN events.codevento_sas IS 'Código do evento no sistema SAS - chave única para sincronização';

-- 4. Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'codevento_sas';

-- 5. Verificar se o índice foi criado
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'events' 
AND indexname = 'idx_events_codevento_sas';