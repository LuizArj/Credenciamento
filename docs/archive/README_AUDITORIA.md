# 🔍 Auditoria do Banco de Dados - Sistema de Credenciamento

Este diretório contém scripts para auditar a integridade do fluxo de dados entre o módulo SAS e o painel administrativo.

---

## 📋 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| **`AUDITORIA_PGADMIN.md`** | ⭐ **RECOMENDADO** - Guia passo a passo para usar no pgAdmin |
| `audit_database.sql` | Script SQL completo de auditoria com 8 verificações |
| `audit.js` | Script Node.js para auditoria (alternativa ao psql) |
| `run_audit.ps1` | Script PowerShell (requer psql instalado) |
| `AUDITORIA_BANCO_DADOS.md` | Documentação completa do fluxo de dados e problemas identificados |

---

## 🚀 Como Executar a Auditoria

### **⭐ Opção 1: Usar pgAdmin (MAIS FÁCIL - RECOMENDADO)**

Se você usa pgAdmin:

1. **Abra:** [`AUDITORIA_PGADMIN.md`](./AUDITORIA_PGADMIN.md)
2. **Siga o guia** com queries prontas para copiar e colar
3. **Diagnostique** problemas em tempo real

**Vantagens:**
- ✅ Não precisa instalar nada
- ✅ Queries prontas para copiar/colar
- ✅ Resultados visuais em tabelas
- ✅ Correções SQL incluídas

---

### **Opção 2: Usar Script Node.js (Alternativa Rápida)**

Se preferir executar via terminal:

```bash
cd c:\Users\luiz.araujo\dev\projeto-credenciamento
node sql/audit.js
```

**Vantagens:**
- ✅ Executa automaticamente todas as verificações
- ✅ Usa credenciais do `.env.local`
- ✅ Resultado formatado no terminal

---

### **Opção 1: Usar o Script PowerShell (Recomendado para Windows)**

1. **Abra o PowerShell** no diretório do projeto:
   ```powershell
   cd c:\Users\luiz.araujo\dev\projeto-credenciamento\sql
   ```

2. **Configure a senha do banco** no arquivo `run_audit.ps1`:
   ```powershell
   # Edite a linha 36 e linha 53:
   $env:PGPASSWORD = "sua_senha_real_aqui"
   ```

3. **Execute o script**:
   ```powershell
   .\run_audit.ps1
   ```

4. **Resultado esperado:**
   - ✅ Exibe 8 seções de auditoria no terminal
   - 💾 Opção de salvar resultados em arquivo `.txt`
   - 🔧 Dicas de troubleshooting ao final

---

## 📊 O Que o Script Verifica

### 1️⃣ **Eventos SAS Sincronizados**
- Lista eventos importados do SAS
- Mostra `codevento_sas`, nome, data e status
- **Problema se vazio:** Sincronização está falhando

### 2️⃣ **Registrations (Inscrições)**
- Lista inscrições de eventos SAS
- Mostra participantes e status
- **Problema se vazio:** Credenciamento não está gravando

### 3️⃣ **Check-ins**
- Lista check-ins realizados em eventos SAS
- Mostra responsável e data/hora
- **Problema se vazio:** Check-ins não estão sendo registrados

### 4️⃣ **Distribuição de Status**
- Conta quantos registrations têm cada status
- **Atenção:** Se maioria for `'confirmed'` e admin não mostrar, problema na query

### 5️⃣ **Eventos SEM Registrations**
- Lista eventos SAS que não têm inscrições
- **Problema se tiver muitos:** Credenciamento não está funcionando

### 6️⃣ **Registrations SEM Check-in**
- Participantes inscritos mas não credenciados
- Útil para identificar inconsistências

### 7️⃣ **Últimas Operações**
- Mostra 5 registros mais recentes de cada tabela
- Útil para verificar se sistema está gravando

### 8️⃣ **Estatísticas Gerais**
- Total de eventos, participantes, registrations e check-ins
- Visão geral do banco

---

## 🔴 Diagnóstico de Problemas

### **Problema: Eventos não aparecem no admin**

Execute a auditoria e verifique:

| Resultado da Auditoria | Diagnóstico | Solução |
|------------------------|-------------|---------|
| ❌ Seção 1 vazia (sem eventos SAS) | Sincronização falhando | Verificar `/api/sync-sas-event` e logs |
| ✅ Seção 1 OK, ❌ Seção 2 vazia | Credenciamento não grava | Verificar `/api/register-local-credenciamento` |
| ✅ Seções 1 e 2 OK, ❌ Seção 5 com muitos eventos | Registrations existem mas admin não lista | Verificar filtros em `/api/admin/events` |
| ✅ Tudo OK, status = `'confirmed'` | Query de contagem errada | Ajustar `events.js` linha 96 |

---

## 🧪 Teste Rápido de Credenciamento

Para verificar se o sistema está funcionando:

1. **Execute a auditoria ANTES do teste:**
   ```powershell
   .\run_audit.ps1
   ```
   - Anote o total de eventos, registrations e check-ins

2. **Faça um credenciamento no módulo SAS:**
   - Acesse `http://localhost:3001/credenciamento-sas`
   - Selecione um evento
   - Credencia uma pessoa
   - Aguarde a mensagem de sucesso

3. **Execute a auditoria DEPOIS do teste:**
   ```powershell
   .\run_audit.ps1
   ```
   - Compare os totais: devem ter aumentado
   - Verifique seção 7 (últimas operações) para ver seu credenciamento

4. **Verifique no admin:**
   - Acesse `http://localhost:3001/admin/events`
   - O evento deve aparecer com 1 inscrito

---

## 🔧 Queries Úteis para Troubleshooting

- **Documentação completa:** `AUDITORIA_BANCO_DADOS.md`
- **Fluxo de credenciamento:** `../pages/credenciamento-sas.js`
- **API de sincronização:** `../pages/api/sync-sas-event.js`
- **API de credenciamento:** `../pages/api/register-local-credenciamento.js`
- **API de listagem:** `../pages/api/admin/events.js`
