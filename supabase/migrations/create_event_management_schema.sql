-- Criar esquema completo de gerenciamento de eventos e participantes

-- ===== TABELA DE EMPRESAS =====
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cnpj TEXT UNIQUE NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    telefone TEXT,
    email TEXT,
    endereco JSONB, -- {logradouro, numero, complemento, bairro, cidade, uf, cep}
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABELA DE EVENTOS =====
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    local TEXT,
    endereco JSONB, -- {logradouro, numero, complemento, bairro, cidade, uf, cep}
    capacidade INTEGER DEFAULT 0,
    modalidade TEXT, -- presencial, online, hibrido
    tipo_evento TEXT, -- workshop, palestra, curso, etc
    publico_alvo TEXT,
    gerente TEXT,
    coordenador TEXT,
    solucao TEXT, -- área de solução do SEBRAE
    unidade TEXT, -- unidade do SEBRAE
    tipo_acao TEXT, -- tipo de ação do evento
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'completed')),
    configuracoes JSONB DEFAULT '{}', -- configurações específicas do evento
    meta_participantes INTEGER DEFAULT 0,
    created_by UUID REFERENCES local_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABELA DE CATEGORIAS DE TICKETS =====
CREATE TABLE IF NOT EXISTS ticket_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
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

-- ===== TABELA DE PARTICIPANTES =====
CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    data_nascimento DATE,
    genero TEXT CHECK (genero IN ('masculino', 'feminino', 'outro', 'nao_informado')),
    escolaridade TEXT,
    profissao TEXT,
    company_id UUID REFERENCES companies(id),
    cargo TEXT, -- cargo na empresa
    endereco JSONB, -- {logradouro, numero, complemento, bairro, cidade, uf, cep}
    fonte TEXT DEFAULT 'manual' CHECK (fonte IN ('manual', 'sas', 'cpe', '4events', 'importacao')),
    dados_externos JSONB DEFAULT '{}', -- dados vindos de APIs externas
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABELA DE REGISTROS/INSCRIÇÕES =====
CREATE TABLE IF NOT EXISTS registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    ticket_category_id UUID REFERENCES ticket_categories(id),
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'checked_in', 'cancelled', 'no_show')),
    forma_pagamento TEXT CHECK (forma_pagamento IN ('gratuito', 'cartao', 'boleto', 'pix', 'outro')),
    valor_pago DECIMAL(10,2) DEFAULT 0.00,
    codigo_inscricao TEXT UNIQUE, -- código único da inscrição
    observacoes TEXT,
    dados_adicionais JSONB DEFAULT '{}', -- campos customizados por evento
    created_by UUID REFERENCES local_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que um participante não se inscreva duas vezes no mesmo evento
    UNIQUE(event_id, participant_id)
);

-- ===== TABELA DE CREDENCIAMENTO/CHECK-IN =====
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
    data_check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responsavel_credenciamento TEXT NOT NULL, -- nome do atendente
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABELA DE LOGS DE AUDITORIA =====
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tabela TEXT NOT NULL, -- nome da tabela afetada
    registro_id UUID NOT NULL, -- ID do registro afetado
    acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
    dados_anteriores JSONB, -- dados antes da alteração (para UPDATE e DELETE)
    dados_novos JSONB, -- dados após a alteração (para INSERT e UPDATE)
    usuario_id UUID REFERENCES local_users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ÍNDICES PARA PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_events_data_inicio ON events(data_inicio);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_participants_cpf ON participants(cpf);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_company ON participants(company_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_participant ON registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_registration ON check_ins(registration_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_data ON check_ins(data_check_in);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela_registro ON audit_logs(tabela, registro_id);

-- ===== TRIGGERS PARA UPDATED_AT =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.id = OLD.id; -- garantir que o ID não mude
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_ticket_categories_updated_at
    BEFORE UPDATE ON ticket_categories
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at
    BEFORE UPDATE ON registrations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ===== TRIGGERS DE AUDITORIA =====
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs(tabela, registro_id, acao, dados_anteriores)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs(tabela, registro_id, acao, dados_anteriores, dados_novos)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs(tabela, registro_id, acao, dados_novos)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Aplicar auditoria nas principais tabelas
CREATE TRIGGER audit_events_trigger
    AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE PROCEDURE audit_trigger();

CREATE TRIGGER audit_participants_trigger
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW EXECUTE PROCEDURE audit_trigger();

CREATE TRIGGER audit_registrations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON registrations
    FOR EACH ROW EXECUTE PROCEDURE audit_trigger();

-- ===== FUNÇÕES DE ATUALIZAÇÃO AUTOMÁTICA =====

-- Atualizar quantidade vendida de tickets
CREATE OR REPLACE FUNCTION update_ticket_sold_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ticket_categories 
        SET quantidade_vendida = quantidade_vendida + 1
        WHERE id = NEW.ticket_category_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ticket_categories 
        SET quantidade_vendida = quantidade_vendida - 1
        WHERE id = OLD.ticket_category_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ticket_count_trigger
    AFTER INSERT OR DELETE ON registrations
    FOR EACH ROW EXECUTE PROCEDURE update_ticket_sold_count();

-- Atualizar status da inscrição no check-in
CREATE OR REPLACE FUNCTION update_registration_status_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE registrations 
    SET status = 'checked_in', updated_at = NOW()
    WHERE id = NEW.registration_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER checkin_status_trigger
    AFTER INSERT ON check_ins
    FOR EACH ROW EXECUTE PROCEDURE update_registration_status_on_checkin();

-- ===== VIEWS PARA RELATÓRIOS =====

-- View: Estatísticas de eventos
CREATE OR REPLACE VIEW event_statistics AS
SELECT 
    e.id,
    e.nome,
    e.data_inicio,
    e.data_fim,
    e.local,
    e.capacidade,
    e.status,
    COUNT(r.id) as total_inscricoes,
    COUNT(CASE WHEN r.status = 'checked_in' THEN 1 END) as total_check_ins,
    COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as total_cancelamentos,
    ROUND(
        (COUNT(CASE WHEN r.status = 'checked_in' THEN 1 END)::float / 
         NULLIF(COUNT(r.id), 0) * 100), 2
    ) as taxa_comparecimento
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id
GROUP BY e.id, e.nome, e.data_inicio, e.data_fim, e.local, e.capacidade, e.status;

-- View: Relatório de participantes
CREATE OR REPLACE VIEW participant_report AS
SELECT 
    p.id,
    p.cpf,
    p.nome,
    p.email,
    p.telefone,
    c.razao_social as empresa,
    COUNT(r.id) as total_eventos,
    MAX(ci.data_check_in) as ultimo_check_in,
    ARRAY_AGG(DISTINCT e.nome ORDER BY e.nome) FILTER (WHERE r.status = 'checked_in') as eventos_participados
FROM participants p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN registrations r ON p.id = r.participant_id
LEFT JOIN check_ins ci ON r.id = ci.registration_id
LEFT JOIN events e ON r.event_id = e.id
GROUP BY p.id, p.cpf, p.nome, p.email, p.telefone, c.razao_social;

-- ===== RLS (ROW LEVEL SECURITY) =====
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (podem ser refinadas conforme necessário)
CREATE POLICY "Enable read access for authenticated users" ON companies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for authenticated users" ON events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for authenticated users" ON ticket_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for authenticated users" ON participants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for authenticated users" ON registrations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for authenticated users" ON check_ins FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for authenticated users" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');

-- ===== DADOS INICIAIS PARA TESTES =====

-- Inserir algumas empresas exemplo
INSERT INTO companies (cnpj, razao_social, nome_fantasia, telefone, email) VALUES
('12.345.678/0001-90', 'Empresa Exemplo LTDA', 'Exemplo Corp', '(11) 1234-5678', 'contato@exemplo.com.br'),
('98.765.432/0001-10', 'Inovação e Tecnologia S.A.', 'InovaTech', '(11) 9876-5432', 'contato@inovatech.com.br')
ON CONFLICT (cnpj) DO NOTHING;

-- Inserir alguns eventos exemplo
INSERT INTO events (nome, descricao, data_inicio, data_fim, local, capacidade, modalidade, tipo_evento, status) VALUES
('Workshop de Inovação Digital', 'Workshop prático sobre transformação digital para pequenas empresas', '2024-02-15 09:00:00', '2024-02-15 17:00:00', 'Auditório SEBRAE', 150, 'presencial', 'workshop', 'active'),
('Palestra sobre Marketing Digital', 'Como usar o marketing digital para alavancar seus negócios', '2024-02-20 14:00:00', '2024-02-20 16:00:00', 'Sala de Conferências', 80, 'presencial', 'palestra', 'active')
ON CONFLICT DO NOTHING;

-- Comentários finais
COMMENT ON TABLE companies IS 'Tabela de empresas/organizações dos participantes';
COMMENT ON TABLE events IS 'Tabela principal de eventos do sistema';
COMMENT ON TABLE ticket_categories IS 'Categorias de tickets/ingressos por evento';
COMMENT ON TABLE participants IS 'Cadastro de participantes do sistema';
COMMENT ON TABLE registrations IS 'Inscrições de participantes em eventos';
COMMENT ON TABLE check_ins IS 'Registro de credenciamento/check-in nos eventos';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria para rastreamento de alterações';