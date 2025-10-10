# Changelog - Sistema de Credenciamento Sebrae

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.1] - 2025-10-10

### 🔧 Corrigido

#### Dependências Atualizadas

**Tipos TypeScript - Compatibilidade com React 18:**
- `@types/react`: 19.1.13 → 18.3.26 ✅
  - Motivo: React 19 ainda está em RC, incompatível com React 18
- `@types/react-dom`: 19.1.9 → 18.3.7 ✅
  - Motivo: React DOM 19 ainda está em RC, incompatível com React 18
- `@types/node`: 24.5.2 → 20.19.20 ✅
  - Motivo: Node 24 não existe, LTS atual é Node 20

**Dependências Removidas:**
- `@tailwindcss/postcss`: 4.0.0-alpha.13 ❌
  - Motivo: Versão alpha (instável), removida para usar versão stable do Tailwind

**Dependências Atualizadas (minor/patch):**
- `@supabase/supabase-js`: 2.57.4 → 2.75.0 ✅
- `eslint`: 9.36.0 → 9.37.0 ✅
- `lucide-react`: 0.544.0 → 0.545.0 ✅
- `typescript`: 5.9.2 → 5.9.3 ✅
- `tailwindcss`: 3.4.17 → 3.4.18 ✅

### 📝 Melhorias de Documentação

- ✅ Criado `STYLE_GUIDE.md` com padrões completos de código
  - Análise de dependências
  - Padrões de nomenclatura
  - Templates de componente React (TypeScript)
  - Templates de API Next.js (TypeScript)
  - Estrutura de pastas proposta
  - Plano de migração
  - Checklists de qualidade
  - Guias de segurança
  
- ✅ Criado `CHANGELOG.md` para rastreamento de mudanças

### ⚙️ Configurações

- ✅ Configurado `npm config set strict-ssl false` para ambiente corporativo

### 🧪 Testes

- ✅ Build de produção testado e funcionando
- ✅ Sem vulnerabilidades detectadas (`npm audit`)
- ⚠️ Warning: `msalInstance` não exportado de `lib/auth.js` (não afeta build)

### 📊 Métricas de Build

```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (15/15)
✓ Collecting build traces
✓ Finalizing page optimization

Total Pages: 15 static, 29 API routes
First Load JS: ~97-112 kB (shared: 104 kB)
```

---

## [1.0.0] - 2025-10-10

### 🔄 Rollback para Estado Limpo

- Executado `git reset --hard origin/main` (commit 4330c0b)
- Revertido de commit 3b0e1ed com melhorias não documentadas
- Executado `git clean -fd` para remover arquivos não rastreados
- Estado: working tree limpo

### 🐛 Correções de Ambiente

- Resolvido erro "supabaseKey is required" em `utils/user-management.js`
- Configurado `.env.local` com variáveis corretas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Roadmap Futuro

### Próximas Versões

#### [1.1.0] - Refatoração de Estrutura (Planejado)
- Criar pasta `/services` para lógica de negócio
- Criar pasta `/schemas` para validações Zod
- Criar pasta `/constants` para constantes compartilhadas
- Criar pasta `/config` para configurações centralizadas
- Migrar componentes críticos para TypeScript

#### [1.2.0] - Melhorias de Qualidade (Planejado)
- Implementar testes unitários (Jest)
- Implementar testes de integração
- Adicionar validações Zod em todas as APIs
- Migrar todos os componentes para TypeScript

#### [2.0.0] - Modernização (Planejado)
- Considerar migração para Next.js 15 (quando estável)
- Considerar migração para NextAuth v5 (quando estável)
- Implementar CI/CD completo
- Adicionar monitoramento (Sentry)
- Implementar feature flags

---

## Referências

- [STYLE_GUIDE.md](./STYLE_GUIDE.md) - Guia completo de padrões de código
- [README.md](./README.md) - Documentação principal do projeto
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

**Mantido por:** Sistema de Credenciamento Sebrae  
**Última atualização:** 2025-10-10
