-- ============================================
-- Migração: Adicionar UNIQUE constraint em check_ins.registration_id
-- Data: 2025-11-10
-- Objetivo: Prevenir múltiplos check-ins para a mesma registration
-- ============================================

-- 1. Verificar e remover duplicatas existentes (manter apenas o mais antigo por data)
DO $$
DECLARE
  duplicates_count INTEGER;
BEGIN
  -- Deletar check-ins duplicados, mantendo apenas o mais antigo (baseado em data_check_in)
  -- Como id é UUID, usamos ROW_NUMBER() com ordenação por data
  DELETE FROM check_ins
  WHERE id IN (
    SELECT id
    FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY registration_id 
          ORDER BY data_check_in ASC, created_at ASC
        ) as row_num
      FROM check_ins
    ) sub
    WHERE row_num > 1
  );
  
  GET DIAGNOSTICS duplicates_count = ROW_COUNT;
  
  IF duplicates_count > 0 THEN
    RAISE NOTICE 'Removidas % check-ins duplicados', duplicates_count;
  ELSE
    RAISE NOTICE 'Nenhum check-in duplicado encontrado';
  END IF;
END $$;

-- 2. Adicionar constraint UNIQUE se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ins_registration_id_key'
  ) THEN
    ALTER TABLE check_ins 
    ADD CONSTRAINT check_ins_registration_id_key 
    UNIQUE (registration_id);
    
    RAISE NOTICE 'Constraint UNIQUE adicionada em check_ins.registration_id';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE já existe em check_ins.registration_id';
  END IF;
END $$;

-- 3. Adicionar índice se não existir (para performance)
CREATE INDEX IF NOT EXISTS idx_check_ins_registration_unique 
ON check_ins(registration_id);

-- 4. Verificação final
SELECT 
  COUNT(*) as total_checkins,
  COUNT(DISTINCT registration_id) as unique_registrations,
  COUNT(*) - COUNT(DISTINCT registration_id) as duplicates
FROM check_ins;

-- Resultado esperado: duplicates = 0
