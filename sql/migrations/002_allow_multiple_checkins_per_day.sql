-- ============================================
-- Migração: Permitir múltiplos check-ins no mesmo evento em dias diferentes
-- Data: 2025-11-11
-- Objetivo: Suportar eventos de múltiplos dias
-- ============================================

-- 1. Remover constraint antiga (registration_id único)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ins_registration_id_key'
  ) THEN
    ALTER TABLE check_ins 
    DROP CONSTRAINT check_ins_registration_id_key;
    
    RAISE NOTICE 'Constraint check_ins_registration_id_key removida';
  ELSE
    RAISE NOTICE 'Constraint check_ins_registration_id_key não existe';
  END IF;
END $$;

-- 2. Adicionar coluna para data (sem hora) e criar trigger para preencher
-- Solução: coluna DATE normal + trigger para manter sincronizada
DO $$
BEGIN
  -- Adicionar coluna data_check_in_date se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'check_ins' AND column_name = 'data_check_in_date'
  ) THEN
    -- Adicionar coluna
    ALTER TABLE check_ins ADD COLUMN data_check_in_date DATE;
    
    -- Popular coluna com dados existentes
    UPDATE check_ins SET data_check_in_date = data_check_in::date;
    
    -- Tornar NOT NULL após popular
    ALTER TABLE check_ins ALTER COLUMN data_check_in_date SET NOT NULL;
    
    RAISE NOTICE 'Coluna data_check_in_date adicionada e populada';
  ELSE
    RAISE NOTICE 'Coluna data_check_in_date já existe';
  END IF;
END $$;

-- Criar trigger para manter data_check_in_date sincronizada
CREATE OR REPLACE FUNCTION update_check_in_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_check_in_date := NEW.data_check_in::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS trigger_update_check_in_date ON check_ins;
CREATE TRIGGER trigger_update_check_in_date
  BEFORE INSERT OR UPDATE OF data_check_in ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_check_in_date();

-- 3. Criar índice único na nova coluna
DO $$
BEGIN
  -- Remover índices antigos
  DROP INDEX IF EXISTS idx_check_ins_registration_unique;
  DROP INDEX IF EXISTS idx_check_ins_registration_date;
  DROP INDEX IF EXISTS idx_check_ins_registration_date_unique;
  
  -- Criar índice único em (registration_id, data_check_in_date)
  CREATE UNIQUE INDEX idx_check_ins_registration_date_unique
  ON check_ins (registration_id, data_check_in_date);
  
  RAISE NOTICE 'Índice UNIQUE criado em (registration_id, data_check_in_date)';
END $$;

-- 4. Verificação final
SELECT 
  COUNT(*) as total_checkins,
  COUNT(DISTINCT registration_id) as unique_registrations,
  COUNT(DISTINCT (registration_id, DATE(data_check_in))) as unique_registration_dates
FROM check_ins;

-- Resultado esperado: total_checkins >= unique_registration_dates
