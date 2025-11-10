-- Cria a tabela de usuários locais
CREATE TABLE IF NOT EXISTS local_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Será armazenado usando hash bcrypt
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cria a tabela de roles (papéis)
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cria a tabela de permissões
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cria a tabela de relação entre roles e permissões
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Cria a tabela de relação entre usuários e roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES local_users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Insere algumas roles padrão
INSERT INTO roles (name, description) VALUES
('admin', 'Administrador do sistema com acesso total'),
('operator', 'Operador com acesso ao credenciamento'),
('viewer', 'Visualizador com acesso somente leitura')
ON CONFLICT (name) DO NOTHING;

-- Insere algumas permissões padrão
INSERT INTO permissions (name, description) VALUES
('users.manage', 'Gerenciar usuários do sistema'),
('users.view', 'Visualizar usuários do sistema'),
('events.manage', 'Gerenciar eventos'),
('events.view', 'Visualizar eventos'),
('credentialing.manage', 'Realizar credenciamento'),
('credentialing.view', 'Visualizar credenciamentos'),
('reports.view', 'Visualizar relatórios')
ON CONFLICT (name) DO NOTHING;

-- Função para atualizar o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar o updated_at
CREATE TRIGGER update_local_users_updated_at
    BEFORE UPDATE ON local_users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE local_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Local users are viewable by authenticated users" ON local_users
    FOR SELECT USING (current_setting('myapp.user_role', true) = 'authenticated');

CREATE POLICY "Local users are insertable by admins" ON local_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = current_setting('myapp.user_id', true)::uuid AND r.name = 'admin'
        )
    );

CREATE POLICY "Local users are updatable by admins" ON local_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = current_setting('myapp.user_id', true)::uuid AND r.name = 'admin'
        )
    );