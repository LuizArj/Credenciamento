-- Criar dados de teste para o sistema de credenciamento
-- Execute este SQL no Supabase após criar o schema principal

-- Limpar dados existentes se necessário (cuidado em produção!)
-- DELETE FROM check_ins;
-- DELETE FROM registrations;
-- DELETE FROM ticket_categories;
-- DELETE FROM participants;
-- DELETE FROM events;
-- DELETE FROM companies;

-- 1. Inserir empresas exemplo
INSERT INTO companies (cnpj, razao_social, nome_fantasia, telefone, email, endereco) VALUES
('12.345.678/0001-90', 'Tech Solutions LTDA', 'TechSol', '(11) 1234-5678', 'contato@techsol.com.br', '{"logradouro": "Rua da Tecnologia", "numero": "123", "bairro": "Centro", "cidade": "São Paulo", "uf": "SP", "cep": "01000-000"}'),
('98.765.432/0001-10', 'Inovação e Desenvolvimento S.A.', 'InoDev', '(11) 9876-5432', 'contato@inodev.com.br', '{"logradouro": "Av. Inovação", "numero": "456", "bairro": "Vila Madalena", "cidade": "São Paulo", "uf": "SP", "cep": "05000-000"}'),
('11.222.333/0001-44', 'Consultoria Empresarial LTDA', 'ConsultEmp', '(11) 5555-1234', 'info@consultemp.com.br', '{"logradouro": "Rua dos Negócios", "numero": "789", "bairro": "Jardins", "cidade": "São Paulo", "uf": "SP", "cep": "01400-000"}')
ON CONFLICT (cnpj) DO NOTHING;

-- 2. Inserir eventos exemplo
INSERT INTO events (
  nome, descricao, data_inicio, data_fim, local, endereco, capacidade, modalidade, 
  tipo_evento, publico_alvo, gerente, coordenador, solucao, unidade, tipo_acao, status, meta_participantes
) VALUES
(
  'Workshop de Transformação Digital',
  'Workshop prático sobre transformação digital para pequenas e médias empresas',
  '2024-11-15 09:00:00',
  '2024-11-15 17:00:00',
  'Auditório SEBRAE SP',
  '{"logradouro": "Rua Vergueiro", "numero": "1117", "bairro": "Liberdade", "cidade": "São Paulo", "uf": "SP", "cep": "01504-001"}',
  150,
  'presencial',
  'workshop',
  'Pequenas e médias empresas',
  'Maria Silva',
  'João Santos',
  'Inovação e Tecnologia',
  'SEBRAE-SP',
  'Capacitação',
  'active',
  120
),
(
  'Palestra: Marketing Digital para Negócios',
  'Como usar o marketing digital para alavancar seus negócios e aumentar as vendas',
  '2024-11-22 14:00:00',
  '2024-11-22 16:30:00',
  'Sala de Conferências - Anexo',
  '{"logradouro": "Rua Vergueiro", "numero": "1117", "bairro": "Liberdade", "cidade": "São Paulo", "uf": "SP", "cep": "01504-001"}',
  80,
  'presencial',
  'palestra',
  'Empreendedores e microempresários',
  'Carlos Oliveira',
  'Ana Costa',
  'Marketing e Vendas',
  'SEBRAE-SP',
  'Orientação',
  'active',
  70
),
(
  'Curso: Gestão Financeira para MEI',
  'Curso completo de gestão financeira voltado para Microempreendedores Individuais',
  '2024-12-05 08:00:00',
  '2024-12-06 18:00:00',
  'Centro de Treinamento SEBRAE',
  '{"logradouro": "Av. Paulista", "numero": "2000", "bairro": "Bela Vista", "cidade": "São Paulo", "uf": "SP", "cep": "01310-000"}',
  40,
  'presencial',
  'curso',
  'MEI - Microempreendedores Individuais',
  'Roberto Lima',
  'Patricia Mendes',
  'Gestão Empresarial',
  'SEBRAE-SP',
  'Capacitação',
  'active',
  35
),
(
  'Webinar: Tendências do E-commerce 2025',
  'Apresentação das principais tendências do comércio eletrônico para o próximo ano',
  '2024-10-25 15:00:00',
  '2024-10-25 16:30:00',
  'Online - Plataforma Zoom',
  '{}',
  500,
  'online',
  'webinar',
  'Empresários do varejo',
  'Fernanda Torres',
  'Miguel Santos',
  'Comércio e Serviços',
  'SEBRAE Nacional',
  'Orientação',
  'completed',
  400
)
ON CONFLICT DO NOTHING;

-- 3. Buscar IDs das empresas e eventos para usar nas próximas inserções
-- (Estes comandos são para referência, os IDs reais devem ser obtidos do banco)

-- 4. Inserir participantes exemplo
INSERT INTO participants (
  cpf, nome, email, telefone, data_nascimento, genero, escolaridade, profissao, 
  cargo, endereco, fonte, company_id
) VALUES
('123.456.789-01', 'João Silva Santos', 'joao.silva@email.com', '(11) 99999-1111', '1985-03-15', 'masculino', 'superior_completo', 'Analista de Sistemas', 'Gerente de TI', '{"logradouro": "Rua das Flores", "numero": "100", "cidade": "São Paulo", "uf": "SP"}', 'manual', (SELECT id FROM companies WHERE cnpj = '12.345.678/0001-90' LIMIT 1)),
('987.654.321-02', 'Maria Oliveira Costa', 'maria.costa@email.com', '(11) 88888-2222', '1990-07-22', 'feminino', 'superior_completo', 'Administradora', 'Diretora Comercial', '{"logradouro": "Av. Brasil", "numero": "200", "cidade": "São Paulo", "uf": "SP"}', 'manual', (SELECT id FROM companies WHERE cnpj = '98.765.432/0001-10' LIMIT 1)),
('456.789.123-03', 'Carlos Eduardo Souza', 'carlos.souza@email.com', '(11) 77777-3333', '1988-12-10', 'masculino', 'superior_incompleto', 'Empresário', 'CEO', '{"logradouro": "Rua do Comércio", "numero": "300", "cidade": "São Paulo", "uf": "SP"}', 'manual', (SELECT id FROM companies WHERE cnpj = '11.222.333/0001-44' LIMIT 1)),
('789.123.456-04', 'Ana Paula Lima', 'ana.lima@email.com', '(11) 66666-4444', '1992-05-18', 'feminino', 'superior_completo', 'Marketing', 'Coordenadora de Marketing', '{"logradouro": "Rua da Paz", "numero": "400", "cidade": "São Paulo", "uf": "SP"}', 'manual', (SELECT id FROM companies WHERE cnpj = '12.345.678/0001-90' LIMIT 1)),
('321.654.987-05', 'Roberto Almeida', 'roberto.almeida@email.com', '(11) 55555-5555', '1980-11-30', 'masculino', 'medio_completo', 'Comerciante', 'Proprietário', '{"logradouro": "Av. Central", "numero": "500", "cidade": "São Paulo", "uf": "SP"}', 'manual', NULL),
('654.987.321-06', 'Fernanda Santos', 'fernanda.santos@email.com', '(11) 44444-6666', '1995-02-14', 'feminino', 'superior_completo', 'Consultora', 'Consultora Sênior', '{"logradouro": "Rua Nova", "numero": "600", "cidade": "São Paulo", "uf": "SP"}', 'manual', (SELECT id FROM companies WHERE cnpj = '11.222.333/0001-44' LIMIT 1))
ON CONFLICT (cpf) DO NOTHING;

-- 5. Inserir categorias de tickets
INSERT INTO ticket_categories (event_id, nome, descricao, preco, quantidade_disponivel, quantidade_vendida, data_inicio_venda, data_fim_venda) VALUES
(
  (SELECT id FROM events WHERE nome = 'Workshop de Transformação Digital' LIMIT 1),
  'Inscrição Gratuita',
  'Inscrição gratuita para o workshop',
  0.00,
  150,
  25,
  '2024-10-01 00:00:00',
  '2024-11-14 23:59:59'
),
(
  (SELECT id FROM events WHERE nome = 'Palestra: Marketing Digital para Negócios' LIMIT 1),
  'Entrada Gratuita',
  'Entrada gratuita para a palestra',
  0.00,
  80,
  15,
  '2024-10-15 00:00:00',
  '2024-11-21 23:59:59'
),
(
  (SELECT id FROM events WHERE nome = 'Curso: Gestão Financeira para MEI' LIMIT 1),
  'Curso Básico',
  'Curso de gestão financeira - nível básico',
  150.00,
  40,
  8,
  '2024-10-20 00:00:00',
  '2024-12-04 23:59:59'
)
ON CONFLICT DO NOTHING;

-- 6. Inserir registrações (inscrições)
INSERT INTO registrations (event_id, participant_id, ticket_category_id, data_inscricao, status, forma_pagamento, valor_pago, codigo_inscricao) VALUES
-- Workshop de Transformação Digital
(
  (SELECT id FROM events WHERE nome = 'Workshop de Transformação Digital' LIMIT 1),
  (SELECT id FROM participants WHERE cpf = '123.456.789-01' LIMIT 1),
  (SELECT id FROM ticket_categories WHERE nome = 'Inscrição Gratuita' LIMIT 1),
  '2024-10-05 10:30:00',
  'confirmed',
  'gratuito',
  0.00,
  'WTD001'
),
(
  (SELECT id FROM events WHERE nome = 'Workshop de Transformação Digital' LIMIT 1),
  (SELECT id FROM participants WHERE cpf = '987.654.321-02' LIMIT 1),
  (SELECT id FROM ticket_categories WHERE nome = 'Inscrição Gratuita' LIMIT 1),
  '2024-10-06 14:15:00',
  'confirmed',
  'gratuito',
  0.00,
  'WTD002'
),
-- Palestra de Marketing Digital
(
  (SELECT id FROM events WHERE nome = 'Palestra: Marketing Digital para Negócios' LIMIT 1),
  (SELECT id FROM participants WHERE cpf = '456.789.123-03' LIMIT 1),
  (SELECT id FROM ticket_categories WHERE nome = 'Entrada Gratuita' LIMIT 1),
  '2024-10-16 09:45:00',
  'registered',
  'gratuito',
  0.00,
  'PMD001'
),
(
  (SELECT id FROM events WHERE nome = 'Palestra: Marketing Digital para Negócios' LIMIT 1),
  (SELECT id FROM participants WHERE cpf = '789.123.456-04' LIMIT 1),
  (SELECT id FROM ticket_categories WHERE nome = 'Entrada Gratuita' LIMIT 1),
  '2024-10-17 16:20:00',
  'confirmed',
  'gratuito',
  0.00,
  'PMD002'
),
-- Curso de Gestão Financeira
(
  (SELECT id FROM events WHERE nome = 'Curso: Gestão Financeira para MEI' LIMIT 1),
  (SELECT id FROM participants WHERE cpf = '321.654.987-05' LIMIT 1),
  (SELECT id FROM ticket_categories WHERE nome = 'Curso Básico' LIMIT 1),
  '2024-10-22 11:00:00',
  'confirmed',
  'pix',
  150.00,
  'CGF001'
),
(
  (SELECT id FROM events WHERE nome = 'Curso: Gestão Financeira para MEI' LIMIT 1),
  (SELECT id FROM participants WHERE cpf = '654.987.321-06' LIMIT 1),
  (SELECT id FROM ticket_categories WHERE nome = 'Curso Básico' LIMIT 1),
  '2024-10-23 13:30:00',
  'registered',
  'cartao',
  150.00,
  'CGF002'
)
ON CONFLICT DO NOTHING;

-- 7. Inserir alguns check-ins
INSERT INTO check_ins (registration_id, data_check_in, responsavel_credenciamento, observacoes) VALUES
(
  (SELECT r.id FROM registrations r 
   JOIN participants p ON r.participant_id = p.id 
   WHERE p.cpf = '123.456.789-01' 
   AND r.codigo_inscricao = 'WTD001' LIMIT 1),
  '2024-11-15 08:45:00',
  'Atendente Maria',
  'Check-in realizado com sucesso'
),
(
  (SELECT r.id FROM registrations r 
   JOIN participants p ON r.participant_id = p.id 
   WHERE p.cpf = '987.654.321-02' 
   AND r.codigo_inscricao = 'WTD002' LIMIT 1),
  '2024-11-15 09:15:00',
  'Atendente João',
  'Participante chegou pontualmente'
)
ON CONFLICT DO NOTHING;

-- 8. Verificar os dados inseridos
SELECT 'Empresas' as tabela, count(*) as total FROM companies
UNION ALL
SELECT 'Eventos', count(*) FROM events
UNION ALL
SELECT 'Participantes', count(*) FROM participants
UNION ALL
SELECT 'Categorias de Tickets', count(*) FROM ticket_categories
UNION ALL
SELECT 'Registrações', count(*) FROM registrations
UNION ALL
SELECT 'Check-ins', count(*) FROM check_ins;

-- 9. Consulta para verificar relacionamentos
SELECT 
  e.nome as evento,
  COUNT(r.id) as total_inscricoes,
  COUNT(c.id) as total_checkins,
  e.capacidade,
  ROUND((COUNT(r.id)::NUMERIC / e.capacidade * 100), 1) as ocupacao_pct
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id
LEFT JOIN check_ins c ON r.id = c.registration_id
GROUP BY e.id, e.nome, e.capacidade
ORDER BY e.data_inicio;