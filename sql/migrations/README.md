# 🗃️ Como Executar Migrações no pgAdmin

## 📋 Índice de Migrations

### ✅ 001_add_unique_constraint_checkins.sql

**Status:** Executada (2025-11-10)  
**Objetivo:** Prevenir check-ins duplicados por registration

### ⏳ 002_allow_multiple_checkins_per_day.sql

**Status:** **PENDENTE - EXECUTAR ANTES DE USAR SISTEMA**  
**Objetivo:** Permitir eventos de múltiplos dias (check-in em dias diferentes)  
**Mudança:** Altera constraint para permitir 1 check-in por dia (não apenas 1 total)

---

## 📋 Passo a Passo

### **1. Abrir pgAdmin**

- Iniciar pgAdmin 4
- Conectar ao servidor PostgreSQL

### **2. Selecionar Banco de Dados**

- Expandir Servers → PostgreSQL
- Expandir Databases
- Clicar com botão direito em **`credenciamento`**
- Selecionar **Query Tool** (ou pressionar `Alt+Shift+Q`)

### **3. Abrir Arquivo de Migração**

Na Query Tool:

- Clicar no ícone **"Open File"** (📂) ou pressionar `Ctrl+O`
- Navegar até: `projeto-credenciamento/sql/migrations/002_allow_multiple_checkins_per_day.sql`
- Selecionar o arquivo e clicar em **"Abrir"**

### **4. Executar a Migração**

- Clicar no botão **"Execute"** (▶️) ou pressionar `F5`
- Aguardar mensagens de confirmação

### **5. Verificar Resultados**

Você verá mensagens como:

```
NOTICE: Removidas 0 check-ins duplicados
NOTICE: Constraint UNIQUE adicionada em check_ins.registration_id

Query returned successfully in X msec.
```

E uma tabela mostrando:
| total_checkins | unique_registrations | duplicates |
|----------------|----------------------|------------|
| X | X | 0 |

**✅ Se `duplicates = 0`, migração foi bem-sucedida!**

---

## ⚠️ **IMPORTANTE**

### **Fazer ANTES do Deploy:**

Esta migração **DEVE** ser executada **ANTES** de fazer o deploy do código novo.

**Ordem correta:**

1. ✅ Executar migração no banco (pgAdmin)
2. ✅ Fazer commit do código
3. ✅ Fazer deploy/restart do servidor

### **Backup Recomendado:**

Antes de executar, faça backup:

```sql
-- No pgAdmin, executar:
-- Botão direito no banco → Backup...
-- Ou via terminal:
pg_dump -U postgres credenciamento > backup_before_migration.sql
```

---

## 🔍 Verificar se Migração Foi Executada

Execute no pgAdmin:

```sql
-- Verificar constraint
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'check_ins'
  AND constraint_type = 'UNIQUE';

-- Deve retornar: check_ins_registration_id_key
```

---

## 🐛 Troubleshooting

### Erro: "constraint already exists"

**Solução:** Migração já foi executada anteriormente. Pode prosseguir com deploy.

### Erro: "permission denied"

**Solução:** Usuário precisa de permissão ALTER TABLE. Execute como superuser (postgres).

### Erro: "duplicate key violation"

**Causa:** Existem duplicatas no banco.
**Solução:** A migração remove automaticamente. Se persistir:

```sql
-- Ver duplicatas:
SELECT registration_id, COUNT(*)
FROM check_ins
GROUP BY registration_id
HAVING COUNT(*) > 1;

-- Remover manualmente se necessário:
DELETE FROM check_ins
WHERE id NOT IN (
    SELECT MIN(id)
    FROM check_ins
    GROUP BY registration_id
);
```

---

## 📞 Precisa de Ajuda?

Consulte: `docs/CONCURRENCY_FIX.md` para mais detalhes técnicos.
