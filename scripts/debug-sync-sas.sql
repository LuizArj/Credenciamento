-- ============================================
-- Script de Diagnóstico: Sincronização SAS
-- Execute este script para verificar o estado após sincronizar
-- ============================================

-- 1. Verificar participantes sincronizados do SAS
SELECT 
  'Total participantes no sistema' as tipo,
  COUNT(*) as quantidade
FROM participants;

SELECT 
  'Participantes vindos do SAS' as tipo,
  COUNT(*) as quantidade
FROM participants
WHERE fonte = 'sas';

-- 2. Para um evento específico, contar registrations
-- SUBSTITUA 'SEU_EVENT_ID' pelo ID do seu evento
SELECT 
  'Registrations no evento' as tipo,
  COUNT(*) as quantidade
FROM registrations
WHERE event_id = 'SEU_EVENT_ID';

-- 3. Verificar participantes SEM registration no evento
SELECT 
  p.id,
  p.nome,
  p.cpf,
  p.fonte
FROM participants p
WHERE p.fonte = 'sas'
  AND NOT EXISTS (
    SELECT 1 
    FROM registrations r 
    WHERE r.participant_id = p.id 
      AND r.event_id = 'SEU_EVENT_ID'
  )
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Verificar registrations criadas recentemente
SELECT 
  r.id,
  r.event_id,
  r.status,
  r.created_at,
  p.nome,
  p.cpf,
  p.fonte
FROM registrations r
JOIN participants p ON p.id = r.participant_id
WHERE r.event_id = 'SEU_EVENT_ID'
ORDER BY r.created_at DESC
LIMIT 10;

-- 5. Resumo por evento
SELECT 
  e.id,
  e.nome,
  e.codevento_sas,
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT CASE WHEN p.fonte = 'sas' THEN r.id END) as registrations_from_sas
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN participants p ON p.id = r.participant_id
WHERE e.codevento_sas IS NOT NULL
GROUP BY e.id, e.nome, e.codevento_sas
ORDER BY e.created_at DESC;
