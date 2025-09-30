# Projeto Credenciamento

Sistema de credenciamento para eventos do Sebrae, integrando com sistemas SAS e CPE, com suporte a múltiplos fluxos de autenticação.

## 🚀 Tecnologias

- [Next.js](https://nextjs.org/) - Framework React com suporte a SSR
- [React](https://reactjs.org/) - Biblioteca UI
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [NextAuth.js](https://next-auth.js.org/) - Autenticação
- [Supabase](https://supabase.com/) - Banco de dados e autenticação local
- [React Query](https://tanstack.com/query/latest) - Gerenciamento de estado e cache

## 📋 Pré-requisitos

- Node.js 18.x ou superior
- npm ou yarn
- Banco de dados PostgreSQL (via Supabase)
- Variáveis de ambiente configuradas

## 🔧 Instalação

1. Clone o repositório
```bash
git clone https://github.com/sebrae/projeto-credenciamento.git
cd projeto-credenciamento
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

4. Configure as seguintes variáveis no `.env`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_servico

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua_chave_secreta

# Keycloak (opcional)
KEYCLOAK_CLIENT_ID=seu_client_id
KEYCLOAK_CLIENT_SECRET=seu_client_secret
KEYCLOAK_ISSUER=sua_url_keycloak
```

5. Execute as migrações do banco
```bash
npm run migrate
```

6. Execute o projeto em desenvolvimento
```bash
npm run dev
```

## 🏗️ Arquitetura

### Estrutura do Projeto

O projeto segue uma arquitetura baseada em componentes com separação clara de responsabilidades:

- `components/`: Componentes React reutilizáveis
- `pages/`: Rotas e páginas da aplicação
  - `api/`: Endpoints da API
  - `admin/`: Área administrativa
- `utils/`: Funções utilitárias e configurações
- `types/`: Definições de tipos TypeScript
- `public/`: Arquivos estáticos
- `styles/`: Estilos globais e temas

### Fluxo de Autenticação

1. **Autenticação Local (Supabase)**
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
  - Múltiplos provedores (Supabase, Keycloak)
  - Tokens JWT com refresh

- **Supabase**
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

# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_servico

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
  - Integração com Supabase

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

- [Manual de Usuário](./docs/MANUAL.md)
- [Guia de Administração](./docs/ADMIN.md)
- [Changelog](./CHANGELOG.md)

## 📄 Licença

Este projeto está sob a licença [MIT](./LICENSE).