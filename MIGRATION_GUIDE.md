# Instruções para Migração do Sistema de Credenciamento

## 📋 Resumo das Alterações

O sistema foi completamente reestruturado para integrar todas as páginas administrativas (Dashboard, Eventos, Participantes e Relatórios) com dados reais do Supabase, substituindo os dados fictícios que existiam anteriormente.

## 🗄️ Migração do Banco de Dados

### 1. Aplicar o Schema Principal

Execute o arquivo de migração principal no seu banco Supabase:

```sql
-- Arquivo: supabase/migrations/create_event_management_schema.sql
```

Este arquivo contém:
- ✅ Tabelas: `companies`, `events`, `ticket_categories`, `participants`, `registrations`, `check_ins`, `audit_logs`
- ✅ Índices para performance
- ✅ Triggers automáticos (updated_at, auditoria, contadores)
- ✅ Views para relatórios (`event_statistics`, `participant_report`)
- ✅ Políticas RLS (Row Level Security)
- ✅ Dados de exemplo para testes

### 2. Verificar Permissões

As seguintes permissões foram adicionadas ao sistema:
- `events.view` - Visualizar eventos
- `events.manage` - Gerenciar eventos
- `participants.view` - Visualizar participantes
- `participants.manage` - Gerenciar participantes
- `dashboard.view` - Acessar dashboard
- `view_reports` - Visualizar relatórios

## 🔄 APIs Atualizadas

### 1. Nova API de Eventos (`/api/admin/events`)
- ✅ CRUD completo com validações
- ✅ Suporte a categorias de tickets
- ✅ Estatísticas automáticas (inscrições, comparecimento)
- ✅ Paginação e filtros
- ✅ Integração com sistema de auditoria

### 2. Nova API de Participantes (`/api/admin/participants`)
- ✅ Gestão completa de participantes
- ✅ Integração com empresas
- ✅ Histórico de eventos
- ✅ Validações de CPF
- ✅ Suporte a dados externos (SAS, 4Events)

### 3. Nova API de Dashboard (`/api/admin/dashboard`)
- ✅ Métricas em tempo real
- ✅ Filtros por período
- ✅ Gráficos de credenciamentos
- ✅ Estatísticas de eventos e empresas
- ✅ Credenciamentos recentes

### 4. API de Relatórios Atualizada (`/api/admin/reports`)
- ✅ Dados reais do banco
- ✅ Relatórios de eventos e participantes
- ✅ Exportação para CSV
- ✅ Filtros por período
- ✅ Estatísticas detalhadas

## 🎨 Páginas Frontend Atualizadas

### 1. Dashboard (`/painel-admin`)
- ✅ Métricas reais em tempo real
- ✅ Filtros de período (dia/semana/mês/ano)
- ✅ Gráficos interativos
- ✅ Credenciamentos recentes
- ✅ Performance por evento
- ✅ Empresas mais ativas

### 2. Gerenciamento de Eventos (`/admin/events`)
- ✅ Conectado com API real
- ✅ Formulários atualizados
- ✅ Exibição de estatísticas
- ✅ Validações no frontend

### 3. Gerenciamento de Participantes (`/admin/participants`)
- ✅ Conectado com API real
- ✅ Integração com empresas
- ✅ Histórico de eventos
- ✅ Filtros e busca

### 4. Relatórios (`/admin/reports`)
- ✅ Dados reais e atualizados
- ✅ Gráficos e estatísticas
- ✅ Exportação funcional

## 🧪 Como Testar

### 1. Após aplicar as migrações:

```bash
# Verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'participants', 'companies', 'registrations', 'check_ins');
```

### 2. Testar as APIs:

```bash
# Listar eventos
GET /api/admin/events

# Listar participantes
GET /api/admin/participants

# Dashboard metrics
GET /api/admin/dashboard?period=month

# Relatórios
GET /api/admin/reports?type=eventReport
```

### 3. Testar no Frontend:

1. Acesse `/painel-admin` - Deve mostrar dados reais
2. Acesse `/admin/events` - Deve listar eventos do banco
3. Acesse `/admin/participants` - Deve listar participantes do banco
4. Acesse `/admin/reports` - Deve gerar relatórios reais

## 🔧 Possíveis Problemas e Soluções

### 1. Erro de Permissões
```sql
-- Garantir que as permissões existam
INSERT INTO permissions (name, description) VALUES
('events.view', 'Visualizar eventos'),
('events.manage', 'Gerenciar eventos'),
('participants.view', 'Visualizar participantes'),
('participants.manage', 'Gerenciar participantes'),
('dashboard.view', 'Acessar dashboard')
ON CONFLICT (name) DO NOTHING;
```

### 2. Tabelas Não Criadas
- Verificar se o usuário tem permissões de criação
- Executar o SQL passo a passo
- Verificar logs de erro do Supabase

### 3. APIs Retornando Erro 500
- Verificar variáveis de ambiente (`SUPABASE_SERVICE_KEY`)
- Verificar logs no console do navegador
- Testar conexão com Supabase

## 📊 Benefícios da Migração

1. **Performance**: Dados reais com índices otimizados
2. **Escalabilidade**: Sistema preparado para crescimento
3. **Auditoria**: Rastreamento completo de alterações
4. **Relatórios**: Dados precisos e atualizados
5. **Integração**: Sistema unificado sem dados mockados
6. **Segurança**: RLS e validações adequadas

## 🚀 Próximos Passos

Após a migração, você pode:

1. **Importar dados existentes** para as novas tabelas
2. **Personalizar relatórios** conforme necessidades específicas
3. **Adicionar novos filtros** nas páginas administrativas
4. **Integrar com sistemas externos** (SAS, 4Events)
5. **Configurar backup automático** dos dados

## ⚠️ Importante

- Faça backup dos dados antes da migração
- Teste em ambiente de desenvolvimento primeiro
- Os dados de exemplo podem ser removidos após os testes
- Mantenha as permissões de usuário adequadas configuradas

---

✅ **Status**: Sistema completamente migrado e funcional com dados reais do Supabase!