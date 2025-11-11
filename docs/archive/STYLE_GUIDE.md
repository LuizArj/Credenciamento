# 📚 Guia de Estilo - Sistema de Credenciamento Sebrae

> **Objetivo:** Estabelecer padrões de código para reimplementação segura, escalável e padronizada.

---

## 📦 1. Análise de Dependências

### Versões Atuais (package.json)

#### ✅ Dependências Principais (Atualizadas)

- **Next.js:** `^14.2.33` ✅ (Última stable: 14.2.x)
- **React:** `^18` ✅ (Última stable: 18.3.x)
- **React DOM:** `^18` ✅
- **@supabase/supabase-js:** `^2.57.4` ✅ (Última stable: 2.x)
- **@tanstack/react-query:** `^5.90.2` ✅ (Última stable: 5.x)
- **TypeScript:** `^5.9.2` ✅ (Última stable: 5.x)
- **Tailwind CSS:** `^3.4.1` ✅ (Última stable: 3.4.x)
- **NextAuth.js:** `^4.24.11` ✅ (Última v4 stable)

#### ⚠️ Dependências com Atenção

- **@types/react:** `^19.1.13` ⚠️
  - **Problema:** React 19 ainda está em RC (Release Candidate)
  - **Recomendação:** Usar `@types/react@^18.3.0` para compatibilidade com React 18
- **@types/react-dom:** `^19.1.9` ⚠️
  - **Problema:** React DOM 19 ainda está em RC
  - **Recomendação:** Usar `@types/react-dom@^18.3.0`

- **@types/node:** `^24.5.2` ⚠️
  - **Problema:** Node 24 não existe ainda (LTS atual é Node 20)
  - **Recomendação:** Usar `@types/node@^20.14.0`

- **@tailwindcss/postcss:** `^4.0.0-alpha.13` ⚠️
  - **Problema:** Versão alpha (instável)
  - **Recomendação:** Remover ou usar versão stable se necessário

### 🔧 Comandos de Atualização Recomendados

```bash
# Corrigir tipos para compatibilidade
npm install --save-dev @types/react@^18.3.0 @types/react-dom@^18.3.0 @types/node@^20.14.0

# Remover dependência alpha instável
npm uninstall @tailwindcss/postcss

# Atualizar outras dependências menores (opcional)
npm update
```

### 📊 Resumo de Dependências

| Categoria                      | Status       | Observação                                             |
| ------------------------------ | ------------ | ------------------------------------------------------ |
| Framework (Next.js/React)      | ✅ Excelente | Versões estáveis e atualizadas                         |
| Database (Supabase)            | ✅ Excelente | Versão mais recente                                    |
| State Management (React Query) | ✅ Excelente | v5 com melhorias                                       |
| Auth (NextAuth)                | ✅ Bom       | v4 stable (considerar migração futura para Auth.js v5) |
| Types (TypeScript/Node)        | ⚠️ Ajustar   | Incompatibilidade de versões                           |
| Styling (Tailwind)             | ✅ Excelente | Versão stable                                          |

---

## 📝 2. Padrões de Nomenclatura

### Componentes React

- **Formato:** `PascalCase`
- **Extensão:** `.tsx` (TypeScript) ou `.jsx`
- **Exemplos:**
  ```
  ✅ ParticipantTable.tsx
  ✅ EventsList.tsx
  ✅ AdminLayout.tsx
  ✅ DashboardMetrics.tsx
  ❌ participantTable.tsx
  ❌ events-list.tsx
  ❌ admin_layout.tsx
  ```

### Páginas e APIs

- **Formato:** `kebab-case`
- **Extensão:** `.js`, `.ts`, `.tsx`
- **Exemplos:**
  ```
  ✅ pages/credenciamento-sas.js
  ✅ pages/api/load-participants.js
  ✅ pages/api/admin/reset-password.js
  ✅ pages/admin/user-management.tsx
  ❌ pages/CredenciamentoSas.js
  ❌ pages/api/loadParticipants.js
  ❌ pages/api/admin/resetPassword.js
  ```

### Hooks Personalizados

- **Formato:** `use` + `PascalCase`
- **Extensão:** `.ts` ou `.tsx`
- **Exemplos:**
  ```
  ✅ hooks/useParticipant.ts
  ✅ hooks/useAuth.ts
  ✅ hooks/useDebounce.ts
  ❌ hooks/participant.ts
  ❌ hooks/UseAuth.ts
  ```

### Utilitários e Helpers

- **Formato:** `camelCase` ou `kebab-case`
- **Extensão:** `.js` ou `.ts`
- **Exemplos:**
  ```
  ✅ utils/formatters.ts
  ✅ utils/api-helpers.ts
  ✅ utils/supabase-client.ts
  ❌ utils/Formatters.ts
  ❌ utils/API_helpers.ts
  ```

### Tipos TypeScript

- **Formato:** `PascalCase`
- **Arquivos:** `kebab-case.types.ts` ou em `types/index.ts`
- **Exemplos:**
  ```typescript
  ✅ type Participant = { ... }
  ✅ interface EventData { ... }
  ✅ type ApiResponse<T> = { ... }
  ❌ type participant = { ... }
  ❌ interface event_data { ... }
  ```

### Variáveis e Funções

- **Formato:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE`
- **Exemplos:**
  ```typescript
  ✅ const userName = 'John';
  ✅ const API_BASE_URL = 'https://api.example.com';
  ✅ function fetchUserData() { ... }
  ❌ const UserName = 'John';
  ❌ const api-base-url = 'https://api.example.com';
  ```

---

## 🏗️ 3. Template de Componente React

### Template Básico (TypeScript)

```tsx
/**
 * ParticipantTable Component
 *
 * @description Exibe uma tabela de participantes com filtro e ações
 * @author Seu Nome
 * @version 1.0.0
 */

import { FC, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Participant {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  empresa?: string;
}

interface ParticipantTableProps {
  /** Lista inicial de participantes */
  participants?: Participant[];
  /** Indica se os dados estão carregando */
  isLoading?: boolean;
  /** Callback quando uma linha é clicada */
  onRowClick?: (participant: Participant) => void;
  /** Classes CSS adicionais */
  className?: string;
  /** Permite filtro de busca */
  enableFilter?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ParticipantTable: FC<ParticipantTableProps> = ({
  participants = [],
  isLoading = false,
  onRowClick,
  className = '',
  enableFilter = true,
}) => {
  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Participant>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // --------------------------------------------------------------------------
  // COMPUTED VALUES
  // --------------------------------------------------------------------------
  const filteredAndSortedParticipants = useMemo(() => {
    let filtered = participants;

    // Aplicar filtro de busca
    if (enableFilter && searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = participants.filter(
        (p) =>
          p.nome.toLowerCase().includes(search) ||
          p.email.toLowerCase().includes(search) ||
          p.cpf.includes(search)
      );
    }

    // Aplicar ordenação
    return [...filtered].sort((a, b) => {
      const aValue = a[sortColumn] || '';
      const bValue = b[sortColumn] || '';

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [participants, searchTerm, sortColumn, sortDirection, enableFilter]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const handleSort = useCallback(
    (column: keyof Participant) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  const handleRowClick = useCallback(
    (participant: Participant) => {
      onRowClick?.(participant);
    },
    [onRowClick]
  );

  // --------------------------------------------------------------------------
  // RENDER STATES
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando participantes...</span>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum participante</h3>
        <p className="mt-1 text-sm text-gray-500">Não há participantes cadastrados ainda.</p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filtro de Busca */}
      {enableFilter && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Buscar participantes"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <span className="text-sm text-gray-600">
            {filteredAndSortedParticipants.length} de {participants.length}
          </span>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('nome')}
              >
                Nome {sortColumn === 'nome' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                Email {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                CPF
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Telefone
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Empresa
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedParticipants.map((participant) => (
              <tr
                key={participant.id}
                onClick={() => handleRowClick(participant)}
                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {participant.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {participant.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {participant.cpf}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {participant.telefone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {participant.empresa || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================
export default ParticipantTable;
```

### Checklist do Template

- ✅ Comentários JSDoc no topo
- ✅ Imports organizados (React, bibliotecas, tipos, componentes)
- ✅ Tipos e interfaces definidas
- ✅ Props tipadas com interface
- ✅ Estado gerenciado com useState
- ✅ Valores computados com useMemo
- ✅ Handlers com useCallback
- ✅ Estados de loading e empty
- ✅ Acessibilidade (aria-label, roles)
- ✅ Classes Tailwind responsivas
- ✅ Export padrão e nomeado

---

## 🔌 4. Template de API Next.js

### Template Básico (TypeScript)

```typescript
/**
 * API Route: Load Participants
 *
 * @route GET /api/admin/load-participants
 * @description Carrega participantes de um evento do sistema SAS
 * @auth Requer autenticação admin
 * @version 1.0.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface LoadParticipantsRequest {
  eventId: string;
  sasCode: string;
}

interface LoadParticipantsSuccess {
  success: true;
  data: {
    participants: Array<{
      id: string;
      nome: string;
      email: string;
      cpf: string;
    }>;
    totalLoaded: number;
    totalSkipped: number;
  };
  message: string;
}

interface ApiError {
  success: false;
  error: string;
  message?: string;
  details?: unknown;
}

type ApiResponse = LoadParticipantsSuccess | ApiError;

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateRequest(body: any): body is LoadParticipantsRequest {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof body.eventId === 'string' &&
    body.eventId.trim() !== '' &&
    typeof body.sasCode === 'string' &&
    body.sasCode.trim() !== ''
  );
}

// ============================================================================
// BUSINESS LOGIC
// ============================================================================

async function loadParticipantsFromSAS(eventId: string, sasCode: string) {
  // Lógica de negócio aqui
  const apiUrl = `https://sas.sebrae.com.br/api/eventos/${sasCode}/participantes`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${process.env.SAS_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro na API SAS: ${response.statusText}`);
  }

  const sasParticipants = await response.json();

  // Processar e salvar no Supabase
  const results = {
    participants: [],
    totalLoaded: 0,
    totalSkipped: 0,
  };

  for (const participant of sasParticipants) {
    try {
      const { data, error } = await supabaseAdmin
        .from('participants')
        .upsert({
          event_id: eventId,
          nome: participant.nome,
          email: participant.email,
          cpf: participant.cpf,
          source: 'sas',
        })
        .select()
        .single();

      if (error) throw error;

      results.participants.push(data);
      results.totalLoaded++;
    } catch (err) {
      console.error(`Erro ao processar participante ${participant.cpf}:`, err);
      results.totalSkipped++;
    }
  }

  return results;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  // --------------------------------------------------------------------------
  // 1. METHOD VALIDATION
  // --------------------------------------------------------------------------
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Método ${req.method} não é suportado. Use POST.`,
    });
  }

  // --------------------------------------------------------------------------
  // 2. AUTHENTICATION
  // --------------------------------------------------------------------------
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Autenticação necessária para acessar este recurso.',
      });
    }

    // Verificar permissões
    const userRoles = session.user.roles || [];
    if (!userRoles.includes('admin') && !userRoles.includes('manager')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Você não tem permissão para executar esta ação.',
      });
    }
  } catch (authError) {
    console.error('Erro na autenticação:', authError);
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      message: 'Erro ao validar autenticação.',
    });
  }

  // --------------------------------------------------------------------------
  // 3. REQUEST VALIDATION
  // --------------------------------------------------------------------------
  if (!validateRequest(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Bad request',
      message: 'Dados inválidos. Campos obrigatórios: eventId, sasCode.',
    });
  }

  const { eventId, sasCode } = req.body;

  // --------------------------------------------------------------------------
  // 4. BUSINESS LOGIC (TRY/CATCH)
  // --------------------------------------------------------------------------
  try {
    console.log(`Iniciando carregamento de participantes: eventId=${eventId}, sasCode=${sasCode}`);

    const results = await loadParticipantsFromSAS(eventId, sasCode);

    console.log(
      `Carregamento concluído: ${results.totalLoaded} salvos, ${results.totalSkipped} ignorados`
    );

    // --------------------------------------------------------------------------
    // 5. SUCCESS RESPONSE
    // --------------------------------------------------------------------------
    return res.status(200).json({
      success: true,
      data: results,
      message: `Carregamento concluído com sucesso. ${results.totalLoaded} participantes salvos.`,
    });
  } catch (error: any) {
    // --------------------------------------------------------------------------
    // 6. ERROR HANDLING
    // --------------------------------------------------------------------------
    console.error('Erro ao carregar participantes:', error);

    // Erros conhecidos
    if (error.message?.includes('API SAS')) {
      return res.status(502).json({
        success: false,
        error: 'External API error',
        message: 'Erro ao comunicar com a API do SAS.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    if (error.message?.includes('Supabase')) {
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Erro ao salvar dados no banco de dados.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    // Erro genérico
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro inesperado ao processar a solicitação.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
export default handler;
```

### Checklist do Template API

- ✅ Comentários JSDoc no topo
- ✅ Tipos de Request e Response definidos
- ✅ Validação de método HTTP (405)
- ✅ Autenticação e autorização (401/403)
- ✅ Validação de request body (400)
- ✅ Try/catch para business logic
- ✅ Tratamento específico de erros (502, 500)
- ✅ Logs estruturados
- ✅ Respostas JSON consistentes
- ✅ Detalhes de erro apenas em dev

### Formato de Resposta Padrão

#### Sucesso (200-299)

```typescript
{
  "success": true,
  "data": { /* payload */ },
  "message": "Operação concluída com sucesso"
}
```

#### Erro (400-599)

```typescript
{
  "success": false,
  "error": "error_code",
  "message": "Descrição legível do erro",
  "details": "Detalhes técnicos (apenas em desenvolvimento)"
}
```

### Códigos HTTP Recomendados

| Código | Uso                   | Exemplo                      |
| ------ | --------------------- | ---------------------------- |
| 200    | Sucesso               | Dados retornados com sucesso |
| 201    | Criado                | Novo recurso criado          |
| 400    | Bad Request           | Dados inválidos no body      |
| 401    | Unauthorized          | Sem autenticação             |
| 403    | Forbidden             | Sem permissão                |
| 404    | Not Found             | Recurso não encontrado       |
| 405    | Method Not Allowed    | Método HTTP incorreto        |
| 409    | Conflict              | Recurso já existe            |
| 422    | Unprocessable Entity  | Validação falhou             |
| 429    | Too Many Requests     | Rate limit excedido          |
| 500    | Internal Server Error | Erro inesperado              |
| 502    | Bad Gateway           | Erro em API externa          |
| 503    | Service Unavailable   | Serviço indisponível         |

---

## 📁 5. Estrutura de Pastas Atual e Melhorias

### Estrutura Atual

```
projeto-credenciamento/
├── components/          ✅ Componentes React
│   ├── AdminLayout.js
│   ├── DashboardContent.js
│   ├── withAdminProtection.js
│   └── admin/
│       ├── dashboard/
│       ├── events/
│       └── layout/
├── hooks/               ✅ Hooks personalizados
│   └── useParticipant.ts
├── lib/                 ✅ Bibliotecas e configurações
│   ├── auth.js
│   └── queryClient.ts
├── middleware/          ✅ Middlewares Next.js
│   ├── auth.js
│   ├── public-access.js
│   └── security.js
├── pages/               ✅ Páginas e rotas
│   ├── _app.tsx
│   ├── index.js
│   ├── login.tsx
│   ├── admin/
│   └── api/
├── public/              ✅ Arquivos estáticos
│   └── sebrae-logo-white.png
├── sql/                 ✅ Scripts SQL
│   ├── schema.sql
│   └── migration_add_codevento_sas.sql
├── styles/              ✅ Estilos globais
│   ├── globals.css
│   └── theme.ts
├── supabase/            ✅ Migrações Supabase
│   └── migrations/
├── types/               ✅ Tipos TypeScript
│   ├── auth.ts
│   ├── database.types.ts
│   └── index.ts
└── utils/               ✅ Utilitários
    ├── api-auth.js
    ├── permissions.js
    ├── supabase-client.ts
    └── validators.js
```

### 🎯 Melhorias Propostas

#### 1. **Criar pasta `/services`**

Centralizar lógica de integração com APIs externas.

```
services/
├── sas.service.ts          # Integração SAS
├── cpe.service.ts          # Integração CPE
├── 4events.service.ts      # Integração 4Events
└── supabase.service.ts     # Operações Supabase encapsuladas
```

**Benefícios:**

- Desacopla lógica de negócio das rotas API
- Facilita testes unitários
- Reutilização de código
- Manutenção centralizada

**Exemplo:**

```typescript
// services/sas.service.ts
export class SASService {
  private baseUrl = process.env.SAS_API_URL;
  private apiKey = process.env.SAS_API_KEY;

  async getEventParticipants(sasCode: string) {
    const response = await fetch(`${this.baseUrl}/eventos/${sasCode}/participantes`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return response.json();
  }

  async validateParticipant(cpf: string, sasCode: string) {
    // ...
  }
}

export const sasService = new SASService();
```

#### 2. **Criar pasta `/schemas`**

Validações centralizadas com Zod.

```
schemas/
├── participant.schema.ts   # Validações de participante
├── event.schema.ts         # Validações de evento
├── auth.schema.ts          # Validações de autenticação
└── index.ts                # Exports centralizados
```

**Benefícios:**

- Validação consistente em frontend e backend
- Type-safety automático
- Documentação implícita

**Exemplo:**

```typescript
// schemas/participant.schema.ts
import { z } from 'zod';

export const participantSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos'),
  telefone: z.string().optional(),
});

export type ParticipantInput = z.infer<typeof participantSchema>;
```

#### 3. **Criar pasta `/constants`**

Constantes compartilhadas.

```
constants/
├── routes.ts               # Rotas da aplicação
├── permissions.ts          # Permissões e roles
├── api-endpoints.ts        # URLs de APIs externas
└── validation-rules.ts     # Regras de validação
```

**Exemplo:**

```typescript
// constants/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN: {
    DASHBOARD: '/admin',
    EVENTS: '/admin/events',
    PARTICIPANTS: '/admin/participants',
  },
  API: {
    AUTH: '/api/auth',
    EVENTS: '/api/admin/events',
  },
} as const;
```

#### 4. **Criar pasta `/tests`**

Testes organizados.

```
tests/
├── unit/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/
│   └── api/
└── e2e/
    └── flows/
```

#### 5. **Refatorar `/lib`**

Organizar melhor as bibliotecas.

```
lib/
├── clients/
│   ├── supabase-server.ts  # Cliente server-side
│   ├── supabase-browser.ts # Cliente client-side
│   └── react-query.ts      # Configuração React Query
├── auth/
│   ├── next-auth.config.ts
│   └── keycloak.config.ts
└── errors/
    ├── api-error.ts
    └── error-handler.ts
```

#### 6. **Padronizar `/types`**

Melhor organização de tipos.

```
types/
├── api/
│   ├── requests.ts
│   └── responses.ts
├── models/
│   ├── participant.ts
│   ├── event.ts
│   └── user.ts
├── database.types.ts       # Gerado pelo Supabase
└── index.ts                # Exports centralizados
```

#### 7. **Criar `/config`**

Configurações centralizadas.

```
config/
├── app.config.ts           # Configurações da aplicação
├── features.config.ts      # Feature flags
└── env.config.ts           # Validação de variáveis de ambiente
```

**Exemplo:**

```typescript
// config/env.config.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  SAS_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

### 📊 Estrutura Proposta Final

```
projeto-credenciamento/
├── components/              # Componentes React (.tsx)
│   ├── shared/             # Componentes reutilizáveis
│   ├── admin/              # Componentes admin
│   └── layouts/            # Layouts
├── config/                  # ⭐ NOVO - Configurações
│   ├── app.config.ts
│   └── env.config.ts
├── constants/               # ⭐ NOVO - Constantes
│   ├── routes.ts
│   └── permissions.ts
├── hooks/                   # Hooks personalizados (.ts)
│   └── useParticipant.ts
├── lib/                     # Bibliotecas
│   ├── clients/            # ⭐ NOVO - Clientes API
│   ├── auth/               # Configurações de auth
│   └── errors/             # ⭐ NOVO - Error handling
├── middleware/              # Middlewares Next.js
├── pages/                   # Páginas Next.js
│   ├── admin/
│   └── api/
├── public/                  # Assets estáticos
├── schemas/                 # ⭐ NOVO - Validações Zod
│   ├── participant.schema.ts
│   └── event.schema.ts
├── services/                # ⭐ NOVO - Lógica de negócio
│   ├── sas.service.ts
│   ├── cpe.service.ts
│   └── supabase.service.ts
├── sql/                     # Scripts SQL
├── styles/                  # Estilos globais
├── supabase/                # Migrações Supabase
├── tests/                   # ⭐ NOVO - Testes
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── types/                   # Tipos TypeScript
│   ├── api/                # ⭐ NOVO - Tipos de API
│   ├── models/             # ⭐ NOVO - Modelos
│   └── database.types.ts
└── utils/                   # Utilitários
    ├── formatters.ts
    └── validators.ts
```

### 🔄 Plano de Migração Gradual

1. **Fase 1 - Criar estrutura** (1 dia)
   - Criar pastas: `/services`, `/schemas`, `/constants`, `/config`
   - Mover código existente gradualmente

2. **Fase 2 - Refatorar APIs** (2-3 dias)
   - Migrar lógica de negócio para `/services`
   - Implementar validações com Zod em `/schemas`
   - Aplicar template de API em todas as rotas

3. **Fase 3 - Refatorar Componentes** (2-3 dias)
   - Migrar componentes `.js` para `.tsx`
   - Aplicar template de componente
   - Adicionar tipos completos

4. **Fase 4 - Testes** (2-3 dias)
   - Configurar Jest/Vitest
   - Adicionar testes unitários
   - Adicionar testes de integração

5. **Fase 5 - Documentação** (1 dia)
   - Documentar todas as APIs
   - Criar README para cada pasta
   - Atualizar documentação geral

---

## ✅ 6. Checklist de Qualidade

### Antes de Fazer Commit

- [ ] Código segue padrões de nomenclatura
- [ ] Tipos TypeScript completos (sem `any`)
- [ ] Componentes têm props tipadas
- [ ] APIs têm validação de entrada
- [ ] Tratamento de erros implementado
- [ ] Logs estruturados adicionados
- [ ] Sem console.log em produção (usar logger)
- [ ] Acessibilidade verificada (ARIA)
- [ ] Responsividade testada
- [ ] Performance analisada (React DevTools)
- [ ] ESLint passou sem erros
- [ ] TypeScript compilou sem erros
- [ ] Testes passaram (quando aplicável)
- [ ] Documentação atualizada

### Antes de Deploy

- [ ] Build de produção funciona (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações de banco aplicadas
- [ ] Testes E2E passaram
- [ ] Performance de produção verificada
- [ ] Segurança auditada (`npm audit`)
- [ ] Backup do banco feito
- [ ] Rollback plan definido

---

## 🔒 7. Segurança

### Variáveis de Ambiente

```env
# ❌ NUNCA commitar chaves secretas
# ✅ Usar apenas em .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # ⚠️ SECRET
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxx  # ⚠️ SECRET

# APIs Externas
SAS_API_KEY=xxx  # ⚠️ SECRET
CPE_API_KEY=xxx  # ⚠️ SECRET
```

### Validação de Entrada

```typescript
// ❌ NUNCA confiar em dados do usuário
// ✅ SEMPRE validar com Zod

import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  cpf: z.string().regex(/^\d{11}$/),
});

// Em API
const validated = schema.parse(req.body);
```

### Sanitização

```typescript
// ❌ NUNCA inserir HTML diretamente
// ✅ Sempre sanitizar

import DOMPurify from 'isomorphic-dompurify';

const clean = DOMPurify.sanitize(userInput);
```

### Rate Limiting

```typescript
// Já implementado em middleware/security.js
// Manter e monitorar logs
```

---

## 📚 8. Recursos e Referências

### Documentação Oficial

- [Next.js](https://nextjs.org/docs)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase](https://supabase.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [NextAuth.js](https://next-auth.js.org/)

### Ferramentas

- [Zod](https://zod.dev/) - Validação de schemas
- [ESLint](https://eslint.org/) - Linting
- [Prettier](https://prettier.io/) - Formatação
- [Jest](https://jestjs.io/) - Testes

### Padrões

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

## 🚀 9. Próximos Passos

1. **Imediato** (Esta semana)
   - [ ] Corrigir versões de dependências
   - [ ] Aplicar este guia em novo código
   - [ ] Revisar código existente

2. **Curto Prazo** (Este mês)
   - [ ] Criar estrutura de pastas proposta
   - [ ] Migrar componentes críticos para TypeScript
   - [ ] Implementar validações com Zod
   - [ ] Adicionar testes unitários

3. **Médio Prazo** (Próximos 3 meses)
   - [ ] Migrar todo código para TypeScript
   - [ ] Implementar testes de integração
   - [ ] Melhorar documentação
   - [ ] Otimizar performance

4. **Longo Prazo** (Próximos 6 meses)
   - [ ] Migrar para NextAuth v5 (quando estável)
   - [ ] Implementar CI/CD completo
   - [ ] Adicionar monitoramento (Sentry)
   - [ ] Implementar feature flags

---

**Versão:** 1.0.0  
**Data:** 2025-10-10  
**Autor:** Sistema de Credenciamento Sebrae  
**Última Atualização:** 2025-10-10
