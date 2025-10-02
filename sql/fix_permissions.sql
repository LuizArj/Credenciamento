-- Verificar e criar permissões necessárias para o sistema
-- Execute este SQL no Supabase para garantir que as permissões existam

-- 1. Criar tabelas de permissões se não existirem
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 2. Inserir role admin se não existir
INSERT INTO roles (name, description) VALUES
('admin', 'Administrador do sistema com acesso total')
ON CONFLICT (name) DO NOTHING;

-- 3. Inserir permissões se não existirem
INSERT INTO permissions (name, description) VALUES
('dashboard.view', 'Acessar dashboard'),
('events.view', 'Visualizar eventos'),
('events.manage', 'Gerenciar eventos'),
('participants.view', 'Visualizar participantes'),
('participants.manage', 'Gerenciar participantes'),
('view_reports', 'Visualizar relatórios'),
('manage_reports', 'Gerenciar relatórios')
ON CONFLICT (name) DO NOTHING;

-- 4. Verificar se as permissões foram criadas
SELECT * FROM permissions WHERE name LIKE '%.%' OR name LIKE '%reports%';

-- 5. Associar todas as permissões ao role de admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.name IN (
  'dashboard.view',
  'events.view', 
  'events.manage',
  'participants.view',
  'participants.manage',
  'view_reports',
  'manage_reports'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 6. Verificar as associações criadas
SELECT r.name as role_name, p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'admin'
ORDER BY p.name;

-- 7. Verificar estrutura final
SELECT 
    'roles' as tabela, 
    count(*) as total 
FROM roles
UNION ALL
SELECT 
    'permissions', 
    count(*) 
FROM permissions
UNION ALL
SELECT 
    'role_permissions', 
    count(*) 
FROM role_permissions;