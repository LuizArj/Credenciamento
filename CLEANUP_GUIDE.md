# 🧹 GUIA DE LIMPEZA E OTIMIZAÇÃO DO SISTEMA

## ✅ O QUE JÁ FOI FEITO

### 1. Schema SQL Final

- ✅ Criado `sql/schema_final.sql` - arquivo único com toda a estrutura do banco
- ✅ Incluídos: tabelas, índices, triggers, constraints corretos
- ✅ Removidas referências ao Supabase RLS
- ✅ Adicionadas views úteis (vw_events_summary, vw_participants_activity)

### 2. Arquivos SQL Obsoletos Removidos

- ✅ temp-recovery-setup.sql
- ✅ migrate-from-supabase.sql
- ✅ audit.js, run_audit.ps1, audit_database.sql
- ✅ DIAGNOSTICO_COMPLETO.sql
- ✅ FIX_CHECK_CONSTRAINT.sql, FIX_RLS_COMPLETE.sql, FIX_RLS_FINAL.sql
- ✅ fix_permissions.sql
- ✅ migration_add_codevento_sas.sql

---

## 🔧 PRÓXIMOS PASSOS

### PASSO 1: Remover Logging Excessivo

#### Arquivo: `pages/api/search-participant.js`

**Linhas para remover/comentar:**

- Linha ~50-60: `console.log('=== INÍCIO DA RESPOSTA BRUTA DO SAS ===', ...)`
- Linha ~70-80: `console.log('=== DADOS PARSEADOS DO SAS ===', ...)`
- Linha ~100: `console.log('SAS: Dados do cliente encontrado:', ...)`
- Linha ~120: `console.log('SAS: Dados formatados:', ...)`

**Manter apenas:**

```javascript
console.log(`Buscando participante: CPF ${cpf}`);
// Em caso de erro:
console.error('Erro ao buscar participante:', error);
```

#### Arquivo: `pages/api/sync-sas-event.js`

**Remover:**

- Dumps completos de dados do evento
- Logs de "Sincronizando evento SAS" com objeto completo

**Manter apenas:**

```javascript
console.log(`Sincronizando evento SAS: ${eventSasId}`);
console.log(`Evento ${eventId} sincronizado com sucesso`);
```

#### Arquivo: `lib/config/database.ts`

**Modificar linhas ~55-65:**

```typescript
// ANTES (muito verboso):
console.log('Query executada:', {
  text: queryConfig.text || queryConfig,
  duration,
  rows: result.rowCount,
});

// DEPOIS (apenas em desenvolvimento):
if (process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true') {
  console.log('[SQL]', {
    query:
      typeof queryConfig === 'string'
        ? queryConfig.substring(0, 100)
        : queryConfig.text.substring(0, 100),
    duration: `${duration}ms`,
    rows: result.rowCount,
  });
}
```

#### Arquivo: `pages/credenciamento-sas.js`

**Remover:** Todos os console.log de dados de participantes

---

### PASSO 2: Remover Documentação Temporária

#### Arquivos para ARQUIVAR (mover para pasta `docs/archive/`):

```
sql/AUDITORIA_PGADMIN.md
sql/README_AUDITORIA.md
AUDITORIA_BANCO_DADOS.md
REFACTORING_PROGRESS.md
REFACTORING_SUMMARY.md
TEMP_RECOVERY_README.md (se ainda existir)
```

#### Comando PowerShell:

```powershell
New-Item -Path 'docs/archive' -ItemType Directory -Force
Move-Item -Path 'sql/AUDITORIA_PGADMIN.md' -Destination 'docs/archive/'
Move-Item -Path 'sql/README_AUDITORIA.md' -Destination 'docs/archive/'
Move-Item -Path 'AUDITORIA_BANCO_DADOS.md' -Destination 'docs/archive/' -ErrorAction SilentlyContinue
Move-Item -Path 'REFACTORING_*.md' -Destination 'docs/archive/' -ErrorAction SilentlyContinue
```

---

### PASSO 3: Criar .env.example

#### Arquivo: `.env.example`

```bash
# ============================================
# CONFIGURAÇÃO DO BANCO DE DADOS
# ============================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=credenciamento
POSTGRES_USER=credenciamento
POSTGRES_PASSWORD=your_secure_password_here

# ============================================
# NEXTAUTH (AUTENTICAÇÃO)
# ============================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_secret_here_min_32_chars

# ============================================
# KEYCLOAK (SSO)
# ============================================
KEYCLOAK_ID=your_client_id
KEYCLOAK_SECRET=your_client_secret
KEYCLOAK_ISSUER=https://your-keycloak-domain/realms/your-realm

# ============================================
# APIs EXTERNAS
# ============================================
# SAS Sebrae
SAS_API_URL=https://sas.sebrae.com.br
SAS_API_KEY=your_sas_api_key

# CPE (Cadastro Pessoa/Empresa)
CPE_API_URL=https://api-cpe.example.com
CPE_API_USER=your_cpe_user
CPE_API_PASSWORD=your_cpe_password

# N8N Webhook
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/checkin

# ============================================
# CONFIGURAÇÕES OPCIONAIS
# ============================================
# Habilitar logs SQL detalhados (apenas desenvolvimento)
DEBUG_SQL=false

# Porta do servidor Next.js
PORT=3000
```

---

### PASSO 4: Verificar Limpeza de Código Legado

#### Itens já realizados (v1.1.0):

1. ✅ `supabase/` - Pasta deletada
2. ✅ `lib/config/supabase.ts` - Arquivo deletado
3. ✅ `services/supabase.service.ts` - Arquivo deletado
4. ✅ Migração completa para PostgreSQL direto via `lib/config/database.ts`

#### Verificar se necessário:

- Revisar imports legados em `lib/auth.js` ou outras APIs antigas
- Executar: `grep -r "supabase" pages/api/` para verificar referências restantes

---

### PASSO 5: Criar README.md Principal

#### Estrutura sugerida para `README.md`:

````markdown
# Sistema de Credenciamento Sebrae

Sistema completo de gerenciamento de eventos e credenciamento integrado com SAS Sebrae.

## 🚀 Funcionalidades

- ✅ Integração com SAS Sebrae (eventos e participantes)
- ✅ Credenciamento SAS e 4Events
- ✅ Check-in de participantes
- ✅ Painel administrativo com relatórios
- ✅ Exportação para Excel
- ✅ Sistema de permissões (admin/manager/operator)
- ✅ Autenticação via Keycloak
- ✅ Importação em massa via Excel/CSV

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 16+
- Conta Keycloak configurada

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone <repo-url>
cd projeto-credenciamento
```
````

### 2. Instale dependências

```bash
npm install
```

### 3. Configure o banco de dados

```bash
# Criar database e usuário
psql -U postgres
CREATE DATABASE credenciamento;
CREATE USER credenciamento WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE credenciamento TO credenciamento;
\q

# Executar schema
psql -d credenciamento -U credenciamento -f sql/schema_final.sql
```

### 4. Configure variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 5. Inicie o servidor

```bash
npm run dev
```

Acesse: http://localhost:3000

## 📚 Documentação

- [Permissões e Roles](PERMISSOES_README.md)
- [Sistema de Importação](IMPORTACAO_README.md)
- [Schema do Banco](sql/schema_final.sql)

## 🔐 Usuário Admin Inicial

Após login via Keycloak, execute no PostgreSQL:

```sql
-- Seu usuário será criado automaticamente
-- Tornar admin:
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM credenciamento_admin_users u, roles r
WHERE u.email = 'seu-email@example.com' AND r.name = 'admin';
```

## 📊 Estrutura do Projeto

```
projeto-credenciamento/
├── pages/
│   ├── api/              # APIs REST
│   ├── admin/            # Painel admin
│   ├── credenciamento-sas.js
│   └── credenciamento-4events.js
├── components/           # Componentes React
├── lib/
│   ├── config/           # Configurações
│   └── utils/            # Utilitários
├── sql/
│   └── schema_final.sql  # Schema completo do DB
└── .env.local            # Variáveis de ambiente
```

## 🧪 Testes

```bash
# Testar conexão com banco
npm run test:db

# Testar autenticação Keycloak
npm run test:auth
```

## 📝 Licença

[Sua licença aqui]

````

---

## 🎯 CHECKLIST FINAL

### Código
- [ ] Remover console.log excessivos (search-participant, sync-sas-event, database.ts)
- [ ] Adicionar process.env.DEBUG_SQL para logs SQL opcionais
- [x] Remover imports/código do Supabase ✅ (Realizado em v1.1.0)
- [ ] Validar error handling em todas as APIs principais

### Documentação
- [ ] Criar/atualizar README.md principal
- [ ] Criar .env.example
- [ ] Arquivar docs temporários (AUDITORIA_*, REFACTORING_*, etc)
- [ ] Manter apenas: README.md, PERMISSOES_README.md, IMPORTACAO_README.md

### Limpeza Realizada (v1.1.0)
- [x] ✅ Pasta `supabase/` deletada
- [x] ✅ Arquivos Supabase removidos (lib/config/supabase.ts, services/supabase.service.ts)
- [x] ✅ Variáveis de ambiente Supabase removidas do .env.local
- [x] ✅ Funções renomeadas (syncToSupabase → syncToDatabase)
- [x] ✅ Documentação histórica movida para docs/archive/

### SQL
- [ ] Validar schema_final.sql está correto
- [ ] Documentar migrations futuras (se necessário)
- [ ] Remover sql/schema.sql antigo (substituído por schema_final.sql)

### Arquivos Obsoletos
- [ ] Deletar pasta `supabase/` se existir
- [ ] Verificar e remover referências a auth-helpers do Supabase
- [ ] Limpar arquivos .sql temporários restantes

### Performance
- [ ] Verificar se todos os índices estão criados (schema_final.sql já tem)
- [ ] Testar queries lentas no admin/events
- [ ] Adicionar pagination onde falta

### Segurança
- [ ] Validar que não há senhas/secrets no código
- [ ] Confirmar que .env.local está no .gitignore
- [ ] Revisar permissões das APIs (middleware de autenticação)

---

## 🚀 COMANDOS RÁPIDOS

### Limpar console.logs:
```bash
# Buscar todos os console.log no projeto
grep -r "console.log" pages/api/ --include="*.js"

# Buscar console.log de dados grandes
grep -r "console.log.*===.*===" pages/api/ --include="*.js"
````

### Arquivar documentação:

```powershell
New-Item -Path 'docs/archive' -ItemType Directory -Force
Move-Item -Path 'sql/AUDITORIA_PGADMIN.md','sql/README_AUDITORIA.md' -Destination 'docs/archive/'
Move-Item -Path 'REFACTORING_*.md','AUDITORIA_*.md' -Destination 'docs/archive/' -ErrorAction SilentlyContinue
```

### Validar schema:

```bash
# Testar schema em banco limpo
dropdb credenciamento_test
createdb credenciamento_test
psql -d credenciamento_test -f sql/schema_final.sql
```

---

## 📞 SUPORTE

Para dúvidas, consulte a documentação ou entre em contato.
