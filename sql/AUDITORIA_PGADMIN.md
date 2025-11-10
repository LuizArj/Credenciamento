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
````markdown
# Arquivo arquivado: Auditoria via pgAdmin

Este arquivo foi movido para `docs/archive/AUDITORIA_PGADMIN.md` para manter o repositório organizado.

Por favor, consulte `docs/archive/AUDITORIA_PGADMIN.md` para a versão completa do guia de auditoria.

````

