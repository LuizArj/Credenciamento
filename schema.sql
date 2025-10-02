-- Schema principal do sistema de credenciamento
-- Execute este arquivo PRIMEIRO no Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco JSONB,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    local VARCHAR(255),
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
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'cancelled', 'completed')) DEFAULT 'draft',
    meta_participantes INTEGER DEFAULT 0,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de participantes
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf VARCHAR(14) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    genero VARCHAR(20) CHECK (genero IN ('masculino', 'feminino', 'outro', 'nao_informado')),
    escolaridade VARCHAR(50) CHECK (escolaridade IN ('fundamental_incompleto', 'fundamental_completo', 'medio_incompleto', 'medio_completo', 'superior_incompleto', 'superior_completo', 'pos_graduacao', 'mestrado', 'doutorado')),
    profissao VARCHAR(255),
    cargo VARCHAR(255),
    endereco JSONB,
    fonte VARCHAR(50) DEFAULT 'manual',
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de categorias de tickets
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

-- 5. Tabela de registrações/inscrições
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    ticket_category_id UUID REFERENCES ticket_categories(id) ON DELETE SET NULL,
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) CHECK (status IN ('registered', 'confirmed', 'cancelled', 'waitlist')) DEFAULT 'registered',
    forma_pagamento VARCHAR(50),
    valor_pago DECIMAL(10,2) DEFAULT 0.00,
    codigo_inscricao VARCHAR(50) UNIQUE,
    dados_adicionais JSONB,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- 6. Tabela de check-ins
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    data_check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responsavel_credenciamento VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_participants_cpf ON participants(cpf);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_data_inicio ON events(data_inicio);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_participant ON registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_registration ON check_ins(registration_id);

-- 8. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_categories_updated_at BEFORE UPDATE ON ticket_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Configurar RLS (Row Level Security) básico
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- 10. Políticas básicas (permitir tudo para usuários autenticados por enquanto)
CREATE POLICY "Permitir tudo para usuários autenticados" ON companies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON participants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON ticket_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON registrations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON check_ins FOR ALL USING (auth.role() = 'authenticated');

-- Verificar se tudo foi criado
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('companies', 'events', 'participants', 'ticket_categories', 'registrations', 'check_ins')
ORDER BY tablename;