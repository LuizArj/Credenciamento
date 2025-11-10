# 🔍 AUDITORIA DO SISTEMA DE CREDENCIAMENTO - FLUXO DE DADOS

**Data da Auditoria:** ${new Date().toLocaleDateString('pt-BR')}  
**Objetivo:** Verificar integridade do fluxo de dados entre módulo SAS e painel administrativo

---

## 📊 FLUXO DE DADOS COMPLETO

### 1. **ENTRADA DE DADOS (Check-in SAS)**

**Arquivo:** `pages/credenciamento-sas.js`

#### Etapa 1: Configuração de Sessão
- Usuário busca evento SAS por código ou nome
- API `/api/fetch-sas-event` ou `/api/sas-events` retorna dados do SAS
- Evento é armazenado em `sessionStorage`

#### Etapa 2: Sincronização de Evento (Background)
```javascript
// Linha 127-145: Sincronização automática
const syncResponse = await fetch('/api/sync-sas-event', {
  method: 'POST',
  body: JSON.stringify({ eventDetails: selectedEvent })
});
```

**⚠️ PROBLEMA 1:** Esta sincronização tem try-catch que **não bloqueia o fluxo** se falhar:
```javascript
catch (err) {
  console.warn('Continuando sem sincronização local');
  // Permite continuar mesmo sem sincronizar!
}
```

#### Etapa 3: Check-in de Participante
```javascript
// Linha 658-662: Mostra sucesso ANTES de confirmar gravação
setSuccess(true);
setLoading(false);
// Processos em background (não aguarda confirmação)
```

**⚠️ PROBLEMA 2:** Interface mostra "sucesso" antes de confirmar gravação no banco!

---

## 🗄️ APIS E BANCO DE DADOS

### API 1: `/api/sync-sas-event`

**Arquivo:** `pages/api/sync-sas-event.js`

**Função:** Sincronizar evento SAS no banco local

**Fluxo:**
1. Recebe `eventDetails.id` (código SAS)
2. Busca evento pelo campo `codevento_sas`:
   ```sql
   SELECT * FROM events WHERE codevento_sas = $1 LIMIT 1
   ```
3. **Se existe:** Atualiza dados (nome, data, status)
4. **Se não existe:** Cria novo evento com:
   - `codevento_sas`: Código do SAS
   - `tipo_evento`: 'evento_sas'
   - `status`: 'active'
   - `ativo`: true

**✅ CÓDIGO CORRETO:** Esta API está funcionando corretamente

---

### API 2: `/api/register-local-credenciamento`

**Arquivo:** `pages/api/register-local-credenciamento.js`

**Função:** Registrar credenciamento completo no banco local

**Fluxo:**
1. **Busca evento local:**
   ```javascript
   // Linha 34-41: Busca por localEventId ou codevento_sas
   SELECT * FROM events WHERE id = $1 LIMIT 1
   SELECT * FROM events WHERE codevento_sas = $1 LIMIT 1
   ```

   **⚠️ PROBLEMA 3:** Se evento não for encontrado, retorna 404 mas o usuário já viu "sucesso"!

2. **Cria/atualiza participante:**
   ```sql
   SELECT * FROM participants WHERE cpf = $1 LIMIT 1
   -- Se existe: UPDATE
   -- Se não: INSERT
   ```

3. **Cria/atualiza inscrição:**
   ```sql
   SELECT * FROM registrations WHERE event_id = $1 AND participant_id = $2
   -- Se existe e status != 'confirmed': UPDATE status = 'confirmed'
   -- Se não: INSERT com status = 'confirmed'
   ```

   **✅ CÓDIGO CORRETO:** Registrations são criadas com `status = 'confirmed'`

4. **Registra check-in:**
   ```sql
   SELECT * FROM check_ins WHERE registration_id = $1
   -- Se não existe: INSERT
   -- Se existe: retorna o existente
   ```

**✅ CÓDIGO CORRETO:** Esta API está funcionando corretamente

---

### API 3: `/api/admin/events` (GET)

**Arquivo:** `pages/api/admin/events.js`

**Função:** Listar eventos no painel administrativo

**Fluxo:**
1. **Busca eventos com filtros:**
   ```sql
   SELECT * FROM events 
   WHERE [filtros dinâmicos]
   ORDER BY [sortBy] [sortOrder]
   LIMIT [limit] OFFSET [offset]
   ```

   **Filtros disponíveis:**
   - `status`: Filtra por status do evento (active/inactive)
   - `search`: Busca em `nome`, `local` ou `codevento_sas`
   - `dateFrom`/`dateTo`: Filtra por `data_inicio`

2. **Conta inscrições para cada evento:**
   ```sql
   SELECT event_id, status FROM registrations 
   WHERE event_id = ANY($1)
   ```

   **Estatísticas calculadas:**
   - `total`: Total de registrations
   - `checkedIn`: Registrations com `status = 'checked_in'`
   - `cancelled`: Registrations com `status = 'cancelled'`

   **⚠️ PROBLEMA 4:** A query não conta registrations com `status = 'confirmed'` na estatística `checkedIn`!

3. **Retorna eventos com:**
   ```javascript
   {
     ...event,
     totalRegistrations: stats.total,
     checkedInCount: stats.checkedIn,
     cancelledCount: stats.cancelled
   }
   ```

---

## 🔴 PROBLEMAS IDENTIFICADOS

### Problema 1: Sincronização silenciosa
**Local:** `credenciamento-sas.js` linha 142-148  
**Impacto:** Eventos podem não ser sincronizados mas sistema continua  
**Solução:** Obrigar sincronização antes de permitir check-in

### Problema 2: Sucesso prematuro
**Local:** `credenciamento-sas.js` linha 658-662  
**Impacto:** Interface mostra "sucesso" antes de confirmar gravação  
**Solução:** Aguardar confirmação antes de mostrar sucesso

### Problema 3: Status divergente
**Local:** `register-local-credenciamento.js` vs `events.js`  
**Impacto:** Registrations criadas com `status = 'confirmed'`, mas admin conta apenas `status = 'checked_in'`  
**Solução:** Padronizar status ou ajustar query de contagem

### Problema 4: Falta de tratamento de erro 404
**Local:** `register-local-credenciamento.js` linha 42-44  
**Impacto:** API retorna 404 mas usuário já viu "sucesso"  
**Solução:** Validar evento antes de mostrar sucesso

---

## ✅ SOLUÇÕES PROPOSTAS

### Solução 1: Forçar sincronização obrigatória
```javascript
// credenciamento-sas.js - handleStart()
try {
  const syncResponse = await fetch('/api/sync-sas-event', {
    method: 'POST',
    body: JSON.stringify({ eventDetails: selectedEvent })
  });
  
  if (!syncResponse.ok) {
    throw new Error('Falha ao sincronizar evento. Tente novamente.');
  }
  
  const syncData = await syncResponse.json();
  // Continuar apenas se sincronização for bem-sucedida
  onSessionStart({
    attendantName: session.user.name,
    eventId: selectedEvent.id,
    eventName: selectedEvent.nome,
    eventDetails: selectedEvent,
    localEventId: syncData.event.id // Garantir que existe
  });
} catch (err) {
  setError('Erro ao sincronizar evento: ' + err.message);
  setLoading(false);
  return; // BLOQUEAR fluxo se falhar
}
```

### Solução 2: Aguardar confirmação antes de mostrar sucesso
```javascript
// credenciamento-sas.js - handleSubmit()
try {
  // 1. Buscar participante
  const searchRes = await fetch('/api/search-participant', {...});
  const searchData = await searchRes.json();
  
  // 2. Enviar webhook (aguardar)
  const webhookRes = await fetch('/api/webhook-checkin', {...});
  if (!webhookRes.ok) {
    throw new Error('Erro ao enviar webhook de check-in');
  }
  
  // 3. Registrar no banco local (aguardar)
  const localRes = await fetch('/api/register-local-credenciamento', {...});
  if (!localRes.ok) {
    const errorData = await localRes.json();
    throw new Error(errorData.message || 'Erro ao registrar credenciamento');
  }
  
  // 4. SOMENTE AGORA mostrar sucesso
  setSuccess(true);
  setLoading(false);
} catch (error) {
  setLoading(false);
  setError(error.message);
  alert('Erro ao credenciar: ' + error.message);
}
```

### Solução 3: Padronizar status de registrations
**Opção A - Atualizar register-local-credenciamento.js:**
```javascript
// Criar registration com status = 'checked_in' direto
const registrationData = {
  event_id: localEvent.id,
  participant_id: localParticipant.id,
  data_inscricao: getCurrentDateTimeGMT4(),
  status: 'checked_in', // ⬅️ MUDAR DE 'confirmed' PARA 'checked_in'
  forma_pagamento: 'sas',
  // ...
};
```

**Opção B - Atualizar events.js (API de listagem):**
```javascript
// Contar também 'confirmed' como inscrições ativas
const statsByEvent = {};
registrationStats.forEach((reg) => {
  const id = reg.event_id;
  if (!statsByEvent[id]) {
    statsByEvent[id] = { total: 0, checkedIn: 0, cancelled: 0 };
  }
  statsByEvent[id].total++;
  // ⬇️ ADICIONAR 'confirmed' NA contagem de check-ins
  if (reg.status === 'checked_in' || reg.status === 'confirmed') {
    statsByEvent[id].checkedIn++;
  }
  if (reg.status === 'cancelled') {
    statsByEvent[id].cancelled++;
  }
});
```

---

## 🧪 SCRIPT DE VERIFICAÇÃO

Execute estas queries SQL para verificar o estado atual:

```sql
-- 1. Verificar eventos SAS sincronizados
SELECT 
  id,
  codevento_sas,
  nome,
  data_inicio,
  status,
  tipo_evento,
  created_at
FROM events
WHERE codevento_sas IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar registrations de eventos SAS
SELECT 
  e.codevento_sas,
  e.nome AS evento_nome,
  r.id AS registration_id,
  r.status AS registration_status,
  p.nome AS participante_nome,
  r.data_inscricao
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN participants p ON p.id = r.participant_id
WHERE e.codevento_sas IS NOT NULL
ORDER BY r.data_inscricao DESC
LIMIT 20;

-- 3. Verificar check-ins de eventos SAS
SELECT 
  e.codevento_sas,
  e.nome AS evento_nome,
  p.nome AS participante_nome,
  ci.data_check_in,
  ci.responsavel_credenciamento
FROM events e
JOIN registrations r ON r.event_id = e.id
JOIN check_ins ci ON ci.registration_id = r.id
JOIN participants p ON p.id = r.participant_id
WHERE e.codevento_sas IS NOT NULL
ORDER BY ci.data_check_in DESC
LIMIT 20;

-- 4. Contar status de registrations
SELECT 
  status,
  COUNT(*) AS total
FROM registrations
GROUP BY status
ORDER BY total DESC;

-- 5. Verificar eventos sem registrations
SELECT 
  id,
  codevento_sas,
  nome,
  data_inicio
FROM events
WHERE id NOT IN (SELECT DISTINCT event_id FROM registrations)
  AND codevento_sas IS NOT NULL
ORDER BY created_at DESC;
```

---

## 📝 CHECKLIST DE VERIFICAÇÃO

- [ ] Executar queries SQL de verificação
- [ ] Confirmar que eventos SAS estão na tabela `events`
- [ ] Confirmar que registrations estão sendo criadas
- [ ] Confirmar que check_ins estão sendo registrados
- [ ] Verificar status das registrations (confirmed vs checked_in)
- [ ] Testar filtros na página admin/events
- [ ] Verificar logs do servidor durante check-in
- [ ] Confirmar que localEventId está sendo passado corretamente

---

## 🚀 PRÓXIMOS PASSOS

1. **IMEDIATO:** Executar queries SQL de verificação para identificar onde está o problema
2. **CURTO PRAZO:** Implementar Solução 3 (padronizar status)
3. **MÉDIO PRAZO:** Implementar Soluções 1 e 2 (melhorar fluxo e tratamento de erros)
4. **LONGO PRAZO:** Adicionar logging detalhado em todas as APIs para facilitar debugging futuro

---

**Autor:** GitHub Copilot  
**Versão:** 1.0  
**Última Atualização:** ${new Date().toLocaleDateString('pt-BR')}
