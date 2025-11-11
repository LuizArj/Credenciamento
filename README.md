# Projeto Credenciamento

# Sistema de Credenciamento Sebrae

![Versão](https://img.shields.io/badge/versão-1.1.0-blue)
![Status](https://img.shields.io/badge/status-produção-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)

Sistema integrado para gerenciamento de eventos e credenciamento de participantes com suporte para operação concorrente e eventos multi-dia.

## 🚀 Tecnologias

- [Next.js](https://nextjs.org/) 14.2 - Framework React com suporte a SSR
- [React](https://reactjs.org/) 18 - Biblioteca UI
- [TypeScript](https://www.typescriptlang.org/) 5.9 - Tipagem estática
- [Tailwind CSS](https://tailwindcss.com/) 3.4 - Framework CSS utility-first
- [NextAuth.js](https://next-auth.js.org/) 4.24 - Autenticação e SSO
- [PostgreSQL](https://www.postgresql.org/) 16+ - Banco de dados relacional
- [React Query](https://tanstack.com/query/latest) 5.x - Gerenciamento de estado e cache
- [Zod](https://zod.dev/) - Validação e schemas TypeScript

## ✨ Funcionalidades

### Integração e Credenciamento

- ✅ Integração com SAS Sebrae (eventos e participantes)
- ✅ Credenciamento SAS e 4Events
- ✅ **Check-in com proteção contra concorrência (ACID + locks pessimistas)** 🆕
- ✅ **Suporte para eventos multi-dia (1 check-in por participante por dia)** 🆕
- ✅ **Alertas inteligentes de check-in duplicado** 🆕
- ✅ Busca de participantes por CPF/CNH
- ✅ Integração com API CPE (Cadastro Pessoa/Empresa)

### Painel Administrativo

- ✅ Gerenciamento completo de eventos
- ✅ Gerenciamento de participantes
- ✅ **Relatórios com breakdown por dia (eventos multi-dia)** 🆕
- ✅ Dashboard com métricas em tempo real
- ✅ Exportação para Excel/CSV
- ✅ Sistema de permissões granular (admin/manager/operator)

### Segurança e Performance

- ✅ Autenticação via Keycloak (SSO corporativo)
- ✅ **Transações ACID com retry automático em deadlocks** 🆕
- ✅ **Suporta 20+ operadores credenciando simultaneamente** 🆕
- ✅ Middleware de proteção de rotas
- ✅ Validação de dados com Zod
- ✅ Rate limiting e headers de segurança

### Importação e Exportação

- ✅ Importação em massa via Excel/CSV
- ✅ Exportação de relatórios (Excel, CSV)
- ✅ Template de importação padronizado

## 📋 Pré-requisitos

- Node.js 18.x ou superior (LTS)
- npm ou yarn
- **PostgreSQL 16+ (requer suporte a triggers e IMMUTABLE functions)**
- Conta Keycloak configurada (para SSO)
- **⚠️ IMPORTANTE:** Se atualizando de v1.0.x, execute as migrations antes de usar v1.1.0

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/sebrae/projeto-credenciamento.git
cd projeto-credenciamento
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

### 4. Configure as variáveis no `.env.local`:

```env
# PostgreSQL (Substituiu Supabase em v1.1.0)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=credenciamento
POSTGRES_USER=credenciamento
POSTGRES_PASSWORD=sua_senha_segura

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere_uma_chave_secreta_min_32_chars

# Keycloak (SSO Corporativo)
KEYCLOAK_CLIENT_ID=seu_client_id
KEYCLOAK_CLIENT_SECRET=seu_client_secret
KEYCLOAK_ISSUER=https://seu-keycloak.com/realms/seu-realm

# APIs Externas
SAS_API_URL=https://sas.sebrae.com.br
SAS_API_KEY=sua_chave_sas
CPE_API_URL=https://api-cpe.example.com
CPE_API_USER=seu_usuario_cpe
CPE_API_PASSWORD=sua_senha_cpe

# N8N Webhook (Opcional)
N8N_WEBHOOK_URL=https://sua-instancia-n8n.com/webhook/checkin
```

### 5. Configure o banco de dados

#### 5.1. Criar database e usuário

```bash
psql -U postgres
```

```sql
CREATE DATABASE credenciamento;
CREATE USER credenciamento WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE credenciamento TO credenciamento;
\q
```

#### 5.2. Executar schema inicial

```bash
psql -d credenciamento -U credenciamento -f sql/schema.sql
```

#### 5.3. Executar migrations (v1.1.0)

```bash
# Migration 001 - Unique constraint
psql -d credenciamento -U credenciamento -f sql/migrations/001_add_unique_constraint_checkins.sql

# Migration 002 - Suporte multi-dia
psql -d credenciamento -U credenciamento -f sql/migrations/002_allow_multiple_checkins_per_day.sql
```

Veja [sql/migrations/README.md](sql/migrations/README.md) para instruções detalhadas.

### 6. Execute o projeto em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## 🏗️ Arquitetura

### Estrutura do Projeto

O projeto segue uma arquitetura baseada em componentes com separação clara de responsabilidades:

- `components/`: Componentes React reutilizáveis
- `pages/`: Rotas e páginas da aplicação
  - `api/`: Endpoints da API REST
  - `admin/`: Área administrativa protegida
- `lib/`: Bibliotecas e configurações
  - `config/`: Configurações de banco e APIs
  - `utils/`: Funções utilitárias (timezone, formatação, etc.)
- `types/`: Definições de tipos TypeScript
- `schemas/`: Schemas Zod para validação
- `services/`: Serviços de integração (SAS, CPE)
- `hooks/`: Custom React hooks
- `sql/`: Scripts e migrations do banco de dados
  - `migrations/`: Migrations versionadas
- `tests/`: Suite de testes
- `docs/`: Documentação técnica
- `public/`: Arquivos estáticos
- `styles/`: Estilos globais e temas

### Gerenciamento de Concorrência 🆕

O sistema implementa controles robustos para operação com múltiplos operadores simultâneos (v1.1.0):

#### Transações ACID

Todas operações de credenciamento executam em transação única atômica. Commits só ocorrem se todas operações tiverem sucesso.

```javascript
// Exemplo simplificado
await withTransaction(async (client) => {
  // 1. Lock no evento
  await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);

  // 2. Criar/atualizar participante
  await client.query('INSERT INTO participants ... ON CONFLICT DO UPDATE ...');

  // 3. Criar/atualizar registro
  await client.query('INSERT INTO registrations ... ON CONFLICT DO UPDATE ...');

  // 4. Criar check-in
  await client.query('INSERT INTO check_ins ... ON CONFLICT DO NOTHING');

  // Se qualquer operação falhar, ROLLBACK automático
});
```

#### Locks Pessimistas

`SELECT FOR UPDATE` serializa acesso a eventos durante credenciamento. Outros operadores aguardam automaticamente.

**Benefícios:**

- Previne race conditions antes que ocorram
- Menor latência (sem retries visíveis ao usuário)
- Zero perda de dados

#### Retry Automático

Deadlocks raros são resolvidos automaticamente com backoff exponencial:

- **Tentativa 1:** Imediato
- **Tentativa 2:** 100ms depois
- **Tentativa 3:** 200ms depois (última)

#### Suporte Multi-dia

Eventos de múltiplos dias permitem 1 check-in por participante por dia:

- Unique constraint em `(registration_id, data_check_in_date)`
- Trigger automático popula data do check-in
- Relatórios mostram breakdown por dia

**Capacidade Testada:** 20+ operadores simultâneos sem conflitos.

**Documentação Técnica Completa:** [docs/CONCURRENCY_FIX.md](docs/CONCURRENCY_FIX.md)

### Fluxo de Autenticação

1. **Autenticação Local (PostgreSQL)**
   - Login com usuário e senha
   - Gerenciamento de roles e permissões
   - Controle de sessão via NextAuth.js

2. **Autenticação Externa (Keycloak)**
   - SSO via OpenID Connect
   - Integração com AD/LDAP
   - Roles sincronizadas com sistema local

3. **Controle de Acesso**
   - RBAC (Role-Based Access Control)
   - Permissões granulares
   - Proteção de rotas da API

4. **Fluxo de Credenciamento**
   - Integração com SAS
   - Fallback para CPE
   - Validação e registro de participantes

## 🔒 Segurança

### Sistema de Autenticação

- **NextAuth.js**
  - Gerenciamento de sessões seguro
  - Múltiplos provedores (PostgreSQL, Keycloak)
  - Tokens JWT com refresh

- **PostgreSQL**
  - Autenticação local com banco PostgreSQL
  - Row Level Security (RLS)
  - Políticas de acesso granulares

- **Roles e Permissões**
  - Role-Based Access Control (RBAC)
  - Permissões granulares por recurso
  - Hierarquia de roles (admin > manager > operator)

### Medidas de Segurança

- Rate limiting por IP
- Headers de segurança (CSP, XSS Protection)
- Sanitização de inputs
- Validações de dados
- Proteção contra CSRF
- Refresh tokens automáticos

### Exemplos de Roles

```sql
-- Roles padrão do sistema
admin       - Acesso total ao sistema
manager     - Gerenciamento de eventos e participantes
operator    - Operações básicas de credenciamento
```

### Configuração de Segurança

```env
# Autenticação
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua_chave_secreta

# PostgreSQL
POSTGRES_HOST=seu_host
POSTGRES_PORT=5432
POSTGRES_USER=seu_usuario
POSTGRES_PASSWORD=sua_senha
POSTGRES_DATABASE=credenciamento
POSTGRES_SSL=false

# Integrações
NEXT_PUBLIC_WEBHOOK_URL=url_do_webhook
NEXT_PUBLIC_SEBRAE_API_URL=url_api_sebrae
SEBRAE_API_KEY=chave_api_sebrae
```

## 📊 Performance e Monitoramento

### Otimizações

- Cache com React Query
  - Caching de requisições
  - Invalidação automática
  - Revalidação em background

- Performance Frontend
  - Lazy loading de componentes
  - Otimização de imagens
  - Code splitting automático
  - Minificação de assets

### Monitoramento

- Logs estruturados
  - Rastreamento de autenticação
  - Logs de acesso admin
  - Erros de integração

- Métricas
  - Performance de autenticação
  - Taxa de sucesso de credenciamento
  - Tempo de resposta das APIs

## 🧪 Testes

### Suíte de Testes

- **Jest + React Testing Library**
  - Testes de componentes
  - Testes de autenticação
  - Mocks de NextAuth.js

- **API Tests**
  - Testes de endpoints
  - Validação de permissões
  - Integração com PostgreSQL

### Executando Testes

```bash
# Instalar dependências
npm install

# Testes unitários
npm run test

# Testes com coverage
npm run test:coverage

# Testes e2e (quando implementados)
npm run test:e2e
```

## 📦 Deploy

### Preparação

1. Configure as variáveis de ambiente:

```bash
# Copie o exemplo e configure
cp .env.example .env.production
```

2. Execute as migrações do banco:

```bash
npm run migrate
```

3. Build do projeto:

```bash
npm run build
```

### Produção

1. Inicie o servidor:

```bash
npm start
```

2. Ou use PM2:

```bash
pm2 start npm --name "credenciamento" -- start
```

## 🤝 Contribuição

1. Fork o projeto
2. Configure o ambiente local
3. Crie sua branch (`git checkout -b feature/NovaFuncionalidade`)
4. Faça suas alterações
5. Execute os testes (`npm test`)
6. Commit (`git commit -m 'Add: NovaFuncionalidade'`)
7. Push (`git push origin feature/NovaFuncionalidade`)
8. Abra um Pull Request

## 📝 Documentação Adicional

### Índice Geral

- [**📚 Índice de Documentação**](docs/INDEX.md) - Ponto de entrada único para toda documentação

### Principais

- [**Correção de Concorrência v1.1.0**](docs/CONCURRENCY_FIX.md) - 🆕 Documentação técnica completa
- [**Resumo Executivo v1.1.0**](docs/EXECUTIVE_SUMMARY_CONCURRENCY.md) - 🆕 Para stakeholders
- [Changelog](CHANGELOG.md) - Histórico de versões
- [Permissões e Roles](docs/user/PERMISSOES_README.md) - Sistema RBAC
- [Sistema de Importação](docs/user/IMPORTACAO_README.md) - Import em massa

### Guias de Melhorias

- [Melhorias Avançadas de UX](docs/improvements/ADVANCED_UX_IMPROVEMENTS.md) - Versão 2.0 (Out/2025)
- [Melhorias de UI](docs/improvements/UI_IMPROVEMENTS.md) - Responsividade, filtros, paginação
- [Melhorias de Segurança](docs/improvements/SECURITY_IMPROVEMENTS.md) - Middleware, Keycloak, timezone

### Guias Técnicos

- [Guia de Estilo](STYLE_GUIDE.md) - Padrões de código (1135 linhas)
- [Guia de Limpeza](CLEANUP_GUIDE.md) - Otimização e manutenção
- [**Guia de Migrations**](sql/migrations/README.md) - 🆕 Executar migrations SQL
- [**Testes de Concorrência**](tests/README.md) - 🆕 Suite de testes

### Referências SQL

- [Schema Principal](sql/schema.sql) - Estrutura completa do banco
- [Verificação SAS](docs/VERIFY_SAS_PARTICIPANT.md) - Debug de integração

### Documentação Arquivada

- [Auditorias e Relatórios Antigos](docs/archive/) - Histórico de refatorações

## 📄 Licença

Este projeto está sob a licença [MIT](./LICENSE).
