# Arquivos SQL - Sistema de Credenciamento

Esta pasta contém todos os arquivos SQL para configuração e manutenção do banco de dados.

## Ordem de Execução

Execute os arquivos na seguinte ordem:

### 1. Schema Principal

- `schema.sql` - Estrutura principal do banco (tabelas, índices, triggers)

### 2. Migrações

- `migration_add_codevento_sas.sql` - Adiciona campo para integração SAS
- `fix_permissions.sql` - Corrige permissões e roles
- `update-users-table.sql` - Atualiza estrutura da tabela de usuários

### 3. Dados de Teste

- `test_data.sql` - Dados de exemplo para desenvolvimento/teste

## Descrição dos Arquivos

- **schema.sql**: Schema completo com todas as tabelas necessárias
- **migration_add_codevento_sas.sql**: Migração para suporte à integração SAS
- **fix_permissions.sql**: Configuração de permissões RLS e roles
- **update-users-table.sql**: Atualizações na tabela de usuários
- **test_data.sql**: Dados de exemplo para testes

## Uso no PostgreSQL

1. Execute o schema.sql primeiro
2. Execute as migrações em ordem
3. Opcionalmente, execute test_data.sql para dados de teste

## Backup

Sempre faça backup antes de executar migrações em produção.
