-- Adicionar colunas necessárias para importação

-- Adicionar coluna 'fonte' na tabela events (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='fonte') THEN
        ALTER TABLE events ADD COLUMN fonte VARCHAR(50) DEFAULT 'manual';
    END IF;
END $$;

-- Adicionar índice na coluna codevento_sas para melhor performance
CREATE INDEX IF NOT EXISTS idx_events_codevento_sas ON events(codevento_sas);

-- Adicionar índice na coluna fonte dos participants
CREATE INDEX IF NOT EXISTS idx_participants_fonte ON participants(fonte);

-- Mostrar mensagem de sucesso
SELECT 'Colunas adicionadas com sucesso!' as status;
