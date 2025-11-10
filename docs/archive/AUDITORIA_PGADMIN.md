# 🔍 Auditoria do Banco via pgAdmin

**Guia rápido para executar auditoria do sistema de credenciamento usando pgAdmin**

---

## 🚀 Como Usar

### 1️⃣ **Abra o pgAdmin**

1. Inicie o pgAdmin 4
2. Conecte ao servidor PostgreSQL (10.23.4.93)
3. Navegue até: **Servers → PostgreSQL → Databases → credenciamento**

---

### 2️⃣ **Abra o Query Tool**

1. Clique com botão direito em **credenciamento**
2. Selecione **Query Tool** (ou pressione `Alt+Shift+Q`)

---

### 3️⃣ **Execute as Queries de Auditoria**

Copie e execute cada query abaixo **uma por vez** no Query Tool.

---

## 📊 QUERIES DE AUDITORIA

### ✅ Query 1: Eventos SAS Sincronizados

```sql
-- Verificar eventos importados do SAS
SELECT 
  id,
  codevento_sas AS "Código SAS",
  nome AS "Nome do Evento",
  TO_CHAR(data_inicio, 'DD/MM/YYYY HH24:MI') AS "Data Início",
  status AS "Status",
  tipo_evento AS "Tipo",
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS "Criado em"
FROM events
WHERE codevento_sas IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Total
SELECT COUNT(*) AS "Total Eventos SAS" 
FROM events 
WHERE codevento_sas IS NOT NULL;
```

**🔎 O que verificar:**
- ✅ Deve haver eventos listados
- ❌ Se vazio: problema na sincronização (API `/api/sync-sas-event`)

---

### ✅ Query 2: Registrations de Eventos SAS

```sql
-- Listar inscrições em eventos SAS
SELECT 
  e.codevento_sas AS "Código SAS",
  SUBSTRING(e.nome, 1, 40) AS "Evento",
  r.id AS "Reg ID",
  r.status AS "Status",
  SUBSTRING(p.nome, 1, 30) AS "Participante",
  TO_CHAR(r.data_inscricao, 'DD/MM/YYYY HH24:MI') AS "Data Inscrição"
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN participants p ON p.id = r.participant_id
WHERE e.codevento_sas IS NOT NULL
ORDER BY r.data_inscricao DESC
LIMIT 20;

-- Total por evento
SELECT 
  e.codevento_sas AS "Código SAS",
  SUBSTRING(e.nome, 1, 50) AS "Evento",
  COUNT(r.id) AS "Total Inscrições"
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
WHERE e.codevento_sas IS NOT NULL
GROUP BY e.id, e.codevento_sas, e.nome
ORDER BY COUNT(r.id) DESC;
```

**🔎 O que verificar:**
- ✅ Eventos devem ter inscrições
- ❌ Se eventos sem inscrições: problema no credenciamento (API `/api/register-local-credenciamento`)

---

### ✅ Query 3: Check-ins Realizados

```sql
-- Listar check-ins de eventos SAS
SELECT 
  e.codevento_sas AS "Código SAS",
  SUBSTRING(e.nome, 1, 40) AS "Evento",
  SUBSTRING(p.nome, 1, 30) AS "Participante",
  TO_CHAR(ci.data_check_in, 'DD/MM/YYYY HH24:MI') AS "Data Check-in",
  SUBSTRING(ci.responsavel_credenciamento, 1, 25) AS "Responsável"
FROM events e
JOIN registrations r ON r.event_id = e.id
JOIN check_ins ci ON ci.registration_id = r.id
JOIN participants p ON p.id = r.participant_id
WHERE e.codevento_sas IS NOT NULL
ORDER BY ci.data_check_in DESC
LIMIT 20;

-- Total por evento
SELECT 
  e.codevento_sas AS "Código SAS",
  SUBSTRING(e.nome, 1, 50) AS "Evento",
  COUNT(ci.id) AS "Total Check-ins"
FROM events e
JOIN registrations r ON r.event_id = e.id
LEFT JOIN check_ins ci ON ci.registration_id = r.id
WHERE e.codevento_sas IS NOT NULL
GROUP BY e.id, e.codevento_sas, e.nome
ORDER BY COUNT(ci.id) DESC;
```

**🔎 O que verificar:**
- ✅ Deve haver check-ins registrados
- ❌ Se inscrições existem mas sem check-ins: problema na tabela `check_ins`

---

### ✅ Query 4: Distribuição de Status ⚠️ **IMPORTANTE**

```sql
-- Verificar status das registrations
SELECT 
  status AS "Status",
  COUNT(*) AS "Total",
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM registrations), 2) AS "Percentual (%)"
FROM registrations
GROUP BY status
ORDER BY COUNT(*) DESC;
```

**🔎 DIAGNÓSTICO CRÍTICO:**
- ✅ Se maioria for `checked_in`: sistema OK
- ⚠️ Se maioria for `confirmed`: **PROBLEMA IDENTIFICADO!**
  - O admin não conta `confirmed` como check-in
  - **Solução:** Ajustar `pages/api/admin/events.js` linha 96

---

### ✅ Query 5: Eventos SEM Inscrições (Problema)

```sql
-- Eventos SAS que não têm nenhuma inscrição
SELECT 
  e.id,
  e.codevento_sas AS "Código SAS",
  SUBSTRING(e.nome, 1, 60) AS "Nome do Evento",
  TO_CHAR(e.data_inicio, 'DD/MM/YYYY') AS "Data",
  e.status AS "Status",
  TO_CHAR(e.created_at, 'DD/MM/YYYY HH24:MI') AS "Criado em"
FROM events e
WHERE e.codevento_sas IS NOT NULL
  AND e.id NOT IN (SELECT DISTINCT event_id FROM registrations WHERE event_id IS NOT NULL)
ORDER BY e.created_at DESC;
```

**🔎 O que verificar:**
- ✅ Lista vazia ou poucos eventos: sistema funcionando
- ❌ Muitos eventos listados: credenciamentos não estão sendo gravados

---

### ✅ Query 6: Estatísticas Gerais

```sql
-- Visão geral do banco
SELECT 
  'Eventos Totais' AS "Métrica",
  COUNT(*) AS "Quantidade"
FROM events
UNION ALL
SELECT 
  'Eventos SAS',
  COUNT(*)
FROM events
WHERE codevento_sas IS NOT NULL
UNION ALL
SELECT 
  'Participantes Totais',
  COUNT(*)
FROM participants
UNION ALL
SELECT 
  'Registrations Totais',
  COUNT(*)
FROM registrations
UNION ALL
SELECT 
  'Check-ins Totais',
  COUNT(*)
FROM check_ins;
```

---

## 🔧 DIAGNÓSTICO RÁPIDO

### Cenário 1: Eventos não aparecem no admin

**Execute Query 1:**
- ✅ Tem eventos → Vá para Cenário 2
- ❌ Sem eventos → Problema na sincronização

**Solução:** Verificar API `/api/sync-sas-event` e logs do servidor

---

### Cenário 2: Eventos existem mas sem inscrições

**Execute Query 5:**
- ✅ Lista vazia → Sistema OK
- ❌ Tem eventos listados → Problema no credenciamento

**Solução:** Verificar API `/api/register-local-credenciamento`

---

### Cenário 3: Inscrições existem mas status errado

**Execute Query 4:**
- ✅ Maioria `checked_in` → Sistema OK
- ⚠️ Maioria `confirmed` → **PROBLEMA ENCONTRADO!**

**Solução imediata - Execute esta query:**

```sql
-- CORREÇÃO: Mudar status de confirmed para checked_in
UPDATE registrations
SET status = 'checked_in'
WHERE event_id IN (
  SELECT id FROM events WHERE codevento_sas IS NOT NULL
)
AND status = 'confirmed';

-- Verificar quantos foram atualizados
SELECT COUNT(*) AS "Registrations Atualizadas" 
FROM registrations 
WHERE status = 'checked_in' 
AND event_id IN (SELECT id FROM events WHERE codevento_sas IS NOT NULL);
```

Depois dessa correção, **atualize a página admin/events** no navegador (F5).

---

## 🧪 TESTE RÁPIDO

### Antes do Teste:
```sql
-- Anote os valores atuais
SELECT 
  (SELECT COUNT(*) FROM events WHERE codevento_sas IS NOT NULL) AS eventos_sas,
  (SELECT COUNT(*) FROM registrations) AS total_registrations,
  (SELECT COUNT(*) FROM check_ins) AS total_checkins;
```

### Faça um credenciamento:
1. Acesse `http://localhost:3001/credenciamento-sas`
2. Selecione um evento
3. Credencia uma pessoa
4. Aguarde mensagem de sucesso

### Depois do Teste:
```sql
-- Valores devem ter aumentado
SELECT 
  (SELECT COUNT(*) FROM events WHERE codevento_sas IS NOT NULL) AS eventos_sas,
  (SELECT COUNT(*) FROM registrations) AS total_registrations,
  (SELECT COUNT(*) FROM check_ins) AS total_checkins;

-- Ver o último credenciamento
SELECT 
  e.codevento_sas,
  e.nome AS evento,
  p.nome AS participante,
  r.status,
  TO_CHAR(ci.data_check_in, 'DD/MM/YYYY HH24:MI:SS') AS data_checkin
FROM check_ins ci
JOIN registrations r ON r.id = ci.registration_id
JOIN events e ON e.id = r.event_id
JOIN participants p ON p.id = r.participant_id
ORDER BY ci.created_at DESC
LIMIT 1;
```

---

## 🎯 CORREÇÃO DO PROBLEMA PRINCIPAL

Se a **Query 4** mostrar que a maioria das registrations tem `status = 'confirmed'`, execute:

```sql
-- CORREÇÃO PERMANENTE
UPDATE registrations
SET status = 'checked_in', updated_at = NOW()
WHERE status = 'confirmed'
AND event_id IN (SELECT id FROM events WHERE codevento_sas IS NOT NULL);

-- Verificar resultado
SELECT status, COUNT(*) 
FROM registrations 
GROUP BY status;
```

**Depois disso:**
1. Pressione F5 na página `admin/events`
2. Os eventos devem aparecer com as inscrições corretas

---

## 📝 QUERIES ÚTEIS EXTRAS

### Buscar evento específico por código SAS:
```sql
SELECT * 
FROM events 
WHERE codevento_sas = '12345';  -- Substitua pelo código
```

### Ver todas as inscrições de um evento:
```sql
SELECT 
  p.nome, 
  r.status, 
  r.data_inscricao,
  ci.data_check_in
FROM registrations r
JOIN participants p ON p.id = r.participant_id
LEFT JOIN check_ins ci ON ci.registration_id = r.id
WHERE r.event_id = (
  SELECT id FROM events WHERE codevento_sas = '12345'  -- Substitua pelo código
);
```

### Ver últimas operações (últimos 10 check-ins):
```sql
SELECT 
  e.codevento_sas,
  e.nome AS evento,
  p.nome AS participante,
  TO_CHAR(ci.created_at, 'DD/MM/YYYY HH24:MI:SS') AS data_hora
FROM check_ins ci
JOIN registrations r ON r.id = ci.registration_id
JOIN events e ON e.id = r.event_id
JOIN participants p ON p.id = r.participant_id
WHERE e.codevento_sas IS NOT NULL
ORDER BY ci.created_at DESC
LIMIT 10;
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

- [ ] Query 1: Eventos SAS existem?
- [ ] Query 2: Eventos têm inscrições?
- [ ] Query 3: Inscrições têm check-ins?
- [ ] Query 4: Status predominante é `checked_in`?
- [ ] Query 5: Poucos ou nenhum evento sem registrations?
- [ ] Teste: Credenciamento aumenta os contadores?

---

**Dica:** Salve essas queries como **Favoritos** no pgAdmin para acesso rápido!

**Atalhos úteis:**
- `F5`: Executar query selecionada
- `F7`: Executar query no cursor
- `Ctrl+Shift+C`: Comentar linha
- `Ctrl+/`: Descomentar linha

---

**Próximos Passos:** 
1. Execute as queries na ordem
2. Anote os resultados da Query 4
3. Se necessário, execute a correção de status
4. Faça um teste de credenciamento
5. Verifique se o evento aparece no admin

**Precisa de ajuda?** Compartilhe os resultados das queries! 🚀
