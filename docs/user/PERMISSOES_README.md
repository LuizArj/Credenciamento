# Sistema de Permissões - Configuração Final

## 📋 Visão Geral

O sistema agora opera com **três níveis de acesso**:

### 🟢 Manager (Gerente) - Role Padrão

Usuários que fazem login via Keycloak recebem **automaticamente** a role `manager` e podem:

- ✅ **Dashboard** (`/admin`)
- ✅ **Eventos** (`/admin/events`)
- ✅ **Participantes** (`/admin/participants`)
- ✅ **Métricas** (`/api/admin/metrics`)
- ✅ **Ver módulo Admin** na tela inicial

### 🔴 Admin (Administrador)

Somente usuários com role `admin` podem acessar:

- ⚠️ **Permissões** (`/admin/permissions`)
- ⚠️ **Gerenciar Usuários** (`/api/admin/users`)
- ⚠️ **Gerenciar Roles** (`/api/admin/roles`)
- ⚠️ **Atualizar Permissões** (`/api/admin/permissions`)
- ✅ Todas as funcionalidades de Manager

### 🟡 Operator (Operador)

Usuários com role `operator` (uso futuro):

- ❌ **NÃO pode acessar** módulo de Administração
- ✅ Pode acessar outras funcionalidades do sistema (credenciamento, QR Code, etc.)
- ❌ **Módulo Admin não aparece** na tela inicial

---

## 🔧 Como o Sistema Funciona

### 1. **Autenticação** (`pages/api/auth/[...nextauth].js`)

- Usuários fazem login via Keycloak
- **Novo usuário** = registrado automaticamente com role `manager`
- Sistema busca as **roles** do usuário no banco de dados PostgreSQL
- Roles são armazenadas no token JWT da sessão

### 2. **Middleware** (`middleware.ts`)

- Verifica se o usuário está autenticado
- **Operators** são bloqueados de acessar `/admin` e `/api/admin`
- Para rotas `/api/admin/permissions`, `/api/admin/users`, `/api/admin/roles`:
  - ✅ Permite acesso apenas para usuários com role `admin`
  - ❌ Redireciona outros para `/admin/unauthorized`
- Para outras rotas admin:
  - ✅ Permite acesso para `admin` e `manager`
  - ❌ Bloqueia `operator`

### 3. **API Protection** (`utils/api-auth.js`)

- Função `withApiAuth()` protege endpoints da API
- Verifica permissões baseadas em:
  - **Role do usuário** (admin, manager, operator)
  - **Permissão específica** da rota
- Admins têm acesso total ao sistema
- Managers têm acesso a eventos, participantes e dashboard

### 4. **Tela Inicial** (`pages/index.js`)

- Módulo "Administração" **só aparece** para usuários com role `admin` ou `manager`
- Operators **não veem** o botão de Administração
- Filtro dinâmico baseado nas roles do usuário

---

## 👥 Gerenciando Permissões

### Como adicionar um novo administrador:

1. **Opção 1: Via Interface Web** (recomendado)
   - Faça login como admin
   - Acesse `/admin/permissions`
   - Marque a checkbox da role `admin` para o usuário desejado

2. **Opção 2: Via SQL Direto** (pgAdmin)

   ```sql
   -- 1. Verificar se o usuário existe
   SELECT id, username, email FROM credenciamento_admin_users WHERE email = 'usuario@example.com';

   -- 2. Se não existir, criar o usuário
   INSERT INTO credenciamento_admin_users (username, email, keycloak_id, created_at, updated_at)
   VALUES ('usuario@example.com', 'usuario@example.com', NULL, NOW(), NOW())
   RETURNING id;

   -- 3. Atribuir role admin (substitua USER_ID pelo id retornado)
   INSERT INTO credenciamento_admin_user_roles (user_id, role_id, created_at)
   SELECT 123, id, NOW()  -- Substitua 123 pelo USER_ID
   FROM credenciamento_admin_roles
   WHERE name = 'admin'
   ON CONFLICT (user_id, role_id) DO NOTHING;
   ```

### Como remover permissões de admin:

```sql
-- Via SQL
DELETE FROM credenciamento_admin_user_roles
WHERE user_id = (SELECT id FROM credenciamento_admin_users WHERE email = 'usuario@example.com')
  AND role_id = (SELECT id FROM credenciamento_admin_roles WHERE name = 'admin');
```

Ou simplesmente desmarque a checkbox na interface `/admin/permissions`.

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas:

```sql
-- Usuários do sistema
credenciamento_admin_users
├── id (PK)
├── username
├── email
├── keycloak_id
├── created_at
└── updated_at

-- Roles disponíveis
credenciamento_admin_roles
├── id (PK)
├── name (admin, manager, operator)
├── description
├── created_at
└── updated_at

-- Relação usuário-role (muitos para muitos)
credenciamento_admin_user_roles
├── id (PK)
├── user_id (FK -> credenciamento_admin_users)
├── role_id (FK -> credenciamento_admin_roles)
└── created_at
```

### Consultas Úteis:

```sql
-- Ver todos os admins
SELECT u.username, u.email
FROM credenciamento_admin_users u
JOIN credenciamento_admin_user_roles ur ON u.id = ur.user_id
JOIN credenciamento_admin_roles r ON ur.role_id = r.id
WHERE r.name = 'admin';

-- Ver todas as roles de um usuário
SELECT u.username, string_agg(r.name, ', ') as roles
FROM credenciamento_admin_users u
LEFT JOIN credenciamento_admin_user_roles ur ON u.id = ur.user_id
LEFT JOIN credenciamento_admin_roles r ON ur.role_id = r.id
WHERE u.email = 'seu.email@example.com'
GROUP BY u.username;

-- Contar usuários por role
SELECT r.name, COUNT(ur.user_id) as total_users
FROM credenciamento_admin_roles r
LEFT JOIN credenciamento_admin_user_roles ur ON r.id = ur.role_id
GROUP BY r.name;
```

---

## 🔒 Roles Disponíveis

| Role         | Descrição     | Permissões                                                                | Auto-atribuída? |
| ------------ | ------------- | ------------------------------------------------------------------------- | --------------- |
| **admin**    | Administrador | Acesso total ao sistema, incluindo gerenciamento de usuários e permissões | ❌ Manual       |
| **manager**  | Gerente       | Gerenciar eventos e participantes, visualizar dashboard e métricas        | ✅ Sim (login)  |
| **operator** | Operador      | Acesso apenas a credenciamento e QR Code (não acessa admin)               | ❌ Manual       |

**Nota:** Ao fazer o primeiro login via Keycloak, o usuário recebe automaticamente a role `manager`.

---

## 🚀 Testando o Sistema

### 1. Como usuário comum (sem role admin):

- ✅ Deve acessar: Dashboard, Eventos, Participantes
- ❌ Deve ver "Acesso Restrito" em: Permissões

### 2. Como administrador:

- ✅ Deve acessar: Todas as páginas
- ✅ Deve conseguir gerenciar permissões de outros usuários

### 3. Verificar logs:

```powershell
# No terminal onde o Next.js está rodando
# Você verá logs como:
NextAuth: Sessão criada para Nome do Usuário
API Auth: Verificando permissões...
```

---

## 🐛 Troubleshooting

### Erro: "Acesso restrito a administradores"

- **Causa:** Usuário não tem role `admin`
- **Solução:** Adicione a role via SQL ou peça para um admin adicionar via interface

### Erro: "Você não tem permissão para acessar esta página"

- **Causa:** Middleware bloqueou o acesso
- **Solução:** Verifique se o usuário está logado e tem as permissões corretas

### Usuário não consegue acessar nenhuma página admin

- **Causa:** Usuário não está autenticado ou sessão expirou
- **Solução:** Faça logout e login novamente

### Mudanças de permissão não aplicam imediatamente

- **Causa:** Token JWT em cache
- **Solução:** Faça logout e login novamente para renovar o token

---

## 📝 Notas Importantes

1. **Primeiro Admin:** Após a instalação, use o script SQL para criar o primeiro admin manualmente
2. **Segurança:** Nunca dê role `admin` para usuários não confiáveis
3. **Backup:** Sempre faça backup do banco antes de modificar permissões em produção
4. **Auditoria:** Considere adicionar logs de auditoria para mudanças de permissões no futuro

---

**Última atualização:** 07/11/2025
