# 📚 Índice de Documentação - Sistema de Credenciamento Sebrae

> **Versão:** 1.1.0  
> **Última Atualização:** 2025-11-11

Este documento serve como ponto de entrada único para toda a documentação do projeto.

---

## 🚀 Início Rápido

### Primeiros Passos

- [**README Principal**](../README.md) - Visão geral, instalação e configuração
- [**Changelog**](../CHANGELOG.md) - Histórico de versões e mudanças
- [**Guia de Instalação**](../README.md#-instalação) - Setup passo-a-passo

### Novidades v1.1.0 🆕

- [**Correção de Concorrência**](CONCURRENCY_FIX.md) - Documentação técnica completa (465 linhas)
- [**Resumo Executivo**](EXECUTIVE_SUMMARY_CONCURRENCY.md) - Para stakeholders e gestores
- [**Guia de Migrations**](../sql/migrations/README.md) - Como executar migrations SQL

---

## 👥 Documentação de Usuário

### Para Operadores e Administradores

- [**Sistema de Permissões**](user/PERMISSOES_README.md) - Roles (admin/manager/operator)
- [**Sistema de Importação**](user/IMPORTACAO_README.md) - Importar participantes em massa via Excel/CSV

### Guias de Uso

- **Credenciamento SAS:** Ver tela principal após login
- **Credenciamento 4Events:** Acesso via menu
- **Painel Admin:** Dashboard, eventos, participantes, relatórios

---

## 👨‍💻 Documentação de Desenvolvedor

### Arquitetura e Implementação

- [**Correção de Concorrência v1.1.0**](CONCURRENCY_FIX.md) ⭐
  - Problema de race conditions
  - Solução ACID com locks pessimistas
  - Padrão UPSERT e retry automático
  - Suporte para eventos multi-dia
  - Exemplos de código antes/depois
- [**Resumo Executivo**](EXECUTIVE_SUMMARY_CONCURRENCY.md)
  - Impacto de negócio
  - Métricas de sucesso
  - Capacidade testada (20+ operadores)

- [**Verificação de Participantes SAS**](VERIFY_SAS_PARTICIPANT.md)
  - Debug de integração SAS
  - Queries úteis
  - Troubleshooting

### Standards e Boas Práticas

- [**Guia de Estilo**](../STYLE_GUIDE.md) - Padrões de código (1135 linhas)
  - Nomenclatura de arquivos e componentes
  - Templates TypeScript
  - Estrutura de pastas
  - Checklists de qualidade
- [**Guia de Limpeza**](../CLEANUP_GUIDE.md)
  - Otimização de código
  - Remoção de logging excessivo
  - Manutenção do projeto

---

## 🎨 Guias de Melhorias Implementadas

### UX/UI

- [**Melhorias Avançadas de UX**](improvements/ADVANCED_UX_IMPROVEMENTS.md) - Versão 2.0 (Out/2025)
  - Correção de datas sem timezone
  - Seletor de tamanho de página (10/25/50/100)
  - Ordenação por colunas (sortable)
  - Visualização em cards para mobile
  - 18.47 KB de documentação detalhada
- [**Melhorias de UI**](improvements/UI_IMPROVEMENTS.md)
  - Filtro de data sem auto-refresh
  - Design responsivo (páginas de eventos)
  - Paginação completa (frontend + backend)
  - Contador total de eventos

### Segurança

- [**Melhorias de Segurança**](improvements/SECURITY_IMPROVEMENTS.md)
  - Proteção de rotas com middleware
  - Remoção de login local (apenas Keycloak)
  - Timezone GMT-4 para check-ins
  - Medidas implementadas (Out/2025)

---

## 🗃️ SQL e Migrações

### Banco de Dados

- [**Schema Principal**](../sql/schema.sql) - Estrutura completa do banco de dados
- [**README SQL**](../sql/README.md) - Informações sobre scripts SQL
- [**Guia de Migrations**](../sql/migrations/README.md) ⭐
  - Como executar migrations no pgAdmin
  - Ordem de execução
  - Validação e rollback
  - Troubleshooting

### Migrations v1.1.0

1. **001_add_unique_constraint_checkins.sql**
   - Remove check-ins duplicados
   - Adiciona unique constraint em `registration_id`
2. **002_allow_multiple_checkins_per_day.sql**
   - Adiciona coluna `data_check_in_date`
   - Cria trigger automático
   - Permite eventos multi-dia

---

## 🧪 Testes

### Suite de Testes

- [**Testes de Concorrência**](../tests/README.md) ⭐
  - Como rodar testes automatizados
  - Interpretação de resultados
  - Simulação de 10 requests simultâneos
- **Script:** `tests/concurrency-test.js`
  - Valida ausência de conflitos
  - Verifica integridade de dados

### Executando Testes

```bash
# Testes de concorrência
node tests/concurrency-test.js

# Testes unitários (quando implementados)
npm test
```

---

## 📦 Documentação Arquivada

### Auditorias e Relatórios Históricos

- [**Documentação Arquivada**](archive/) - Pasta com documentos históricos
  - `AUDITORIA_BANCO_DADOS.md` - Auditoria de banco (Out/2025)
  - `AUDITORIA_PGADMIN.md` - Auditoria específica do pgAdmin
  - `README_AUDITORIA.md` - Documentação de auditorias
  - `REFACTORING_PROGRESS.md` - Progresso de refatoração
  - `REFACTORING_SUMMARY.md` - Resumo de refatoração
  - `CONFORMANCE_REPORT.md` - Relatório de conformidade (Out/2025)

**Nota:** Estes documentos são mantidos apenas para referência histórica. Não refletem o estado atual do sistema.

---

## 🔍 Busca Rápida por Tópico

### Por Funcionalidade

- **Autenticação:** Ver [README § Segurança](../README.md#-segurança)
- **Concorrência:** Ver [CONCURRENCY_FIX.md](CONCURRENCY_FIX.md)
- **Multi-dia:** Ver [CONCURRENCY_FIX.md § Multi-day](CONCURRENCY_FIX.md)
- **Importação:** Ver [IMPORTACAO_README.md](user/IMPORTACAO_README.md)
- **Permissões:** Ver [PERMISSOES_README.md](user/PERMISSOES_README.md)
- **SAS Integration:** Ver [VERIFY_SAS_PARTICIPANT.md](VERIFY_SAS_PARTICIPANT.md)

### Por Tecnologia

- **PostgreSQL:** Ver [sql/schema.sql](../sql/schema.sql) e [sql/migrations/](../sql/migrations/)
- **Next.js:** Ver [README § Tecnologias](../README.md#-tecnologias)
- **TypeScript:** Ver [STYLE_GUIDE.md](../STYLE_GUIDE.md)
- **React Query:** Ver código em `pages/admin/`
- **Keycloak:** Ver [SECURITY_IMPROVEMENTS.md](../SECURITY_IMPROVEMENTS.md)

### Por Versão

- **v1.1.0:** Ver [CHANGELOG § 1.1.0](../CHANGELOG.md#110---2025-11-11)
- **v1.0.1:** Ver [CHANGELOG § 1.0.1](../CHANGELOG.md#101---2025-10-10)
- **v1.0.0:** Ver [CHANGELOG § 1.0.0](../CHANGELOG.md#100---2025-10-10)

---

## 🆘 Precisa de Ajuda?

### Por Onde Começar?

**Se você é novo no projeto:**

1. Leia o [README Principal](../README.md)
2. Siga o [Guia de Instalação](../README.md#-instalação)
3. Consulte [PERMISSOES_README.md](user/PERMISSOES_README.md) para entender roles

**Se você é desenvolvedor:**

1. Leia [STYLE_GUIDE.md](../STYLE_GUIDE.md) para padrões de código
2. Consulte [CONCURRENCY_FIX.md](CONCURRENCY_FIX.md) para entender arquitetura v1.1.0
3. Veja [sql/migrations/README.md](../sql/migrations/README.md) antes de executar migrations

**Se você está atualizando de v1.0.x:**

1. Faça backup do banco: `pg_dump -U credenciamento credenciamento > backup.sql`
2. Siga [sql/migrations/README.md](../sql/migrations/README.md) passo-a-passo
3. Leia [CHANGELOG § v1.1.0](../CHANGELOG.md#110---2025-11-11) para breaking changes

**Se você encontrou um problema:**

1. Consulte seção de **Troubleshooting** no documento relevante
2. Verifique [CHANGELOG](../CHANGELOG.md) se já foi corrigido em versão mais recente
3. Consulte [docs/archive/](archive/) para documentos históricos relacionados

---

## 📈 Roadmap de Documentação

### Em Progresso

- [ ] Manual de Usuário completo (docs/user/MANUAL.md)
- [ ] Guia de Administração (docs/admin/ADMIN_GUIDE.md)
- [ ] API Reference (docs/api/API_REFERENCE.md)

### Futuro

- [ ] Diagramas de arquitetura (PlantUML/Mermaid)
- [ ] Vídeos tutoriais
- [ ] FAQ consolidado
- [ ] Guia de troubleshooting consolidado

---

## 📞 Informações de Contato

- **Repositório:** [GitHub](https://github.com/sebrae/projeto-credenciamento)
- **Issues:** [GitHub Issues](https://github.com/sebrae/projeto-credenciamento/issues)
- **Email:** [suporte@sebrae.com.br](mailto:suporte@sebrae.com.br)

---

**Última Atualização:** 2025-11-11 (v1.1.0)  
**Mantido Por:** Equipe Sebrae - Sistema de Credenciamento  
**Feedback:** Pull requests e issues são bem-vindos!
