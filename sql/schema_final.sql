-- ============================================
-- SCHEMA COMPLETO DO SISTEMA DE CREDENCIAMENTO
-- PostgreSQL 16+
-- ============================================
-- 
-- Este arquivo contém toda a estrutura do banco de dados
-- necessária para o sistema funcionar.
-- 
-- COMO USAR:
-- 1. Crie o database: CREATE DATABASE credenciamento;
-- 2. Crie o usuário: CREATE USER credenciamento WITH PASSWORD 'sua_senha';
-- 3. Execute este arquivo: psql -d credenciamento -U postgres -f schema_final.sql
-- 4. Garanta permissões: GRANT ALL PRIVILEGES ON DATABASE credenciamento TO credenciamento;
--
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- 1. Empresas/Companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco JSONB,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Eventos
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codevento_sas VARCHAR(50) UNIQUE,  -- Código do evento no SAS
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    local VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    endereco JSONB,
    capacidade INTEGER DEFAULT 0,
    modalidade VARCHAR(20) CHECK (modalidade IN ('presencial', 'online', 'hibrido')) DEFAULT 'presencial',
    tipo_evento VARCHAR(50),
    publico_alvo TEXT,
    gerente VARCHAR(255),
    coordenador VARCHAR(255),
    solucao VARCHAR(255),
    unidade VARCHAR(255),
    tipo_acao VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'cancelled', 'completed')) DEFAULT 'active',
    meta_participantes INTEGER DEFAULT 0,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Participantes
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf VARCHAR(14) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    data_nascimento DATE,
    genero VARCHAR(20) CHECK (genero IN ('masculino', 'feminino', 'outro', 'nao_informado')),
    escolaridade VARCHAR(50) CHECK (escolaridade IN (
        'fundamental_incompleto', 'fundamental_completo', 
        'medio_incompleto', 'medio_completo', 
        'superior_incompleto', 'superior_completo', 
        'pos_graduacao', 'mestrado', 'doutorado'
    )),
    profissao VARCHAR(255),
    cargo VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    endereco JSONB,
    fonte VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'sas', 'importacao'
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Categorias de Tickets
CREATE TABLE IF NOT EXISTS ticket_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) DEFAULT 0.00,
    quantidade_disponivel INTEGER DEFAULT 0,
    quantidade_vendida INTEGER DEFAULT 0,
    data_inicio_venda TIMESTAMP WITH TIME ZONE,
    data_fim_venda TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inscrições/Registrations
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    ticket_category_id UUID REFERENCES ticket_categories(id) ON DELETE SET NULL,
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled', 'checked_in', 'waiting_list')) DEFAULT 'confirmed',
    forma_pagamento VARCHAR(50) DEFAULT 'sas',
    valor_pago DECIMAL(10,2) DEFAULT 0.00,
    codigo_inscricao VARCHAR(50) UNIQUE,
    dados_adicionais JSONB,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- 6. Check-ins
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    data_check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responsavel_credenciamento VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(registration_id)  -- Um check-in por registration
);

-- ============================================
-- TABELAS DE ADMINISTRAÇÃO E SEGURANÇA
-- ============================================

-- 7. Usuários Locais (para login local sem Keycloak)
CREATE TABLE IF NOT EXISTS local_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Usuários Admin (com roles)
CREATE TABLE IF NOT EXISTS credenciamento_admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keycloak_id UUID UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_local_user BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Roles do sistema
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,  -- 'admin', 'manager', 'operator'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Relação usuário-role
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES credenciamento_admin_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 11. Logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabela VARCHAR(100),
    registro_id UUID,
    acao VARCHAR(20),  -- 'INSERT', 'UPDATE', 'DELETE'
    dados_antigos JSONB,
    dados_novos JSONB,
    usuario_id UUID,
    usuario_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Eventos
CREATE INDEX IF NOT EXISTS idx_events_codevento_sas ON events(codevento_sas) WHERE codevento_sas IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_data_inicio ON events(data_inicio);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_ativo ON events(ativo);

-- Participantes
CREATE INDEX IF NOT EXISTS idx_participants_cpf ON participants(cpf);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_fonte ON participants(fonte);
CREATE INDEX IF NOT EXISTS idx_participants_company_id ON participants(company_id);

-- Registrations
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_participant_id ON registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_data_inscricao ON registrations(data_inscricao);

-- Check-ins
CREATE INDEX IF NOT EXISTS idx_checkins_registration_id ON check_ins(registration_id);
CREATE INDEX IF NOT EXISTS idx_checkins_data_check_in ON check_ins(data_check_in);

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);

-- Admin users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON credenciamento_admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_keycloak_id ON credenciamento_admin_users(keycloak_id) WHERE keycloak_id IS NOT NULL;

-- User roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON check_ins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON credenciamento_admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger de auditoria
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs(tabela, registro_id, acao, dados_novos)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs(tabela, registro_id, acao, dados_antigos, dados_novos)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs(tabela, registro_id, acao, dados_antigos)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoria nas tabelas críticas
CREATE TRIGGER audit_events AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_participants AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_registrations AFTER INSERT OR UPDATE OR DELETE ON registrations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_check_ins AFTER INSERT OR UPDATE OR DELETE ON check_ins
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================
-- DADOS INICIAIS (SEED)
-- ============================================

-- Inserir roles padrão
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrador com acesso total ao sistema'),
    ('manager', 'Gerente com acesso a eventos e relatórios'),
    ('operator', 'Operador com acesso apenas ao credenciamento')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PERMISSÕES
-- ============================================

-- Garantir permissões para o usuário credenciamento
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO credenciamento;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO credenciamento;
GRANT USAGE ON SCHEMA public TO credenciamento;

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: Eventos com contagem de inscrições
CREATE OR REPLACE VIEW vw_events_summary AS
SELECT 
    e.id,
    e.codevento_sas,
    e.nome,
    e.data_inicio,
    e.data_fim,
    e.local,
    e.cidade,
    e.status,
    COUNT(DISTINCT r.id) as total_inscricoes,
    COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END) as confirmados,
    COUNT(DISTINCT CASE WHEN r.status = 'checked_in' THEN r.id END) as credenciados,
    COUNT(DISTINCT ci.id) as total_checkins
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN check_ins ci ON ci.registration_id = r.id
WHERE e.ativo = true
GROUP BY e.id, e.codevento_sas, e.nome, e.data_inicio, e.data_fim, e.local, e.cidade, e.status
ORDER BY e.data_inicio DESC;

-- View: Participantes com última participação
CREATE OR REPLACE VIEW vw_participants_activity AS
SELECT 
    p.id,
    p.cpf,
    p.nome,
    p.email,
    p.telefone,
    p.fonte,
    COUNT(DISTINCT r.event_id) as total_eventos,
    MAX(r.data_inscricao) as ultima_inscricao,
    COUNT(DISTINCT ci.id) as total_checkins
FROM participants p
LEFT JOIN registrations r ON r.participant_id = p.id
LEFT JOIN check_ins ci ON ci.registration_id = r.id
WHERE p.ativo = true
GROUP BY p.id, p.cpf, p.nome, p.email, p.telefone, p.fonte
ORDER BY MAX(r.data_inscricao) DESC NULLS LAST;

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE events IS 'Eventos do sistema, sincronizados com SAS via codevento_sas';
COMMENT ON TABLE participants IS 'Participantes únicos por CPF, origem: manual, sas ou importação';
COMMENT ON TABLE registrations IS 'Inscrições de participantes em eventos';
COMMENT ON TABLE check_ins IS 'Check-ins realizados nos eventos';
COMMENT ON TABLE credenciamento_admin_users IS 'Usuários com acesso ao painel administrativo';
COMMENT ON TABLE roles IS 'Roles do sistema: admin, manager, operator';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria de todas as operações críticas';

COMMENT ON COLUMN events.codevento_sas IS 'Código único do evento no sistema SAS Sebrae';
COMMENT ON COLUMN participants.fonte IS 'Origem do cadastro: manual, sas, importacao';
COMMENT ON COLUMN registrations.status IS 'Status: pending, confirmed, checked_in, cancelled, waiting_list';

-- ============================================
-- FIM DO SCHEMA
-- ============================================

-- Verificação final
SELECT 
    'Tabelas criadas:' as info,
    COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

SELECT 
    'Índices criados:' as info,
    COUNT(*) as total
FROM pg_indexes 
WHERE schemaname = 'public';

SELECT 
    'Triggers criados:' as info,
    COUNT(*) as total
FROM pg_trigger 
WHERE tgrelid IN (
    SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace
);
