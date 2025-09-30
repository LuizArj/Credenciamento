# Guia de Estilo e Padrões de Código

## Nomenclatura

### Arquivos e Pastas
- Componentes: PascalCase (ex: `Button.tsx`, `UserProfile.tsx`)
- Hooks: camelCase com prefixo 'use' (ex: `useAuth.ts`, `useParticipant.ts`)
- Utilitários: camelCase (ex: `validators.ts`, `formatters.ts`)
- Types/Interfaces: PascalCase (ex: `Participant.ts`, `EventTypes.ts`)
- APIs: kebab-case (ex: `search-participant.ts`, `process-credenciamento.ts`)

### Variáveis e Funções
- Variáveis: camelCase e descritivas (ex: `participantName`, `eventDetails`)
- Funções: camelCase e verbos (ex: `handleSubmit`, `formatCPF`)
- Constantes: UPPERCASE_SNAKE_CASE (ex: `API_URL`, `MAX_RETRIES`)
- Interfaces: PascalCase com prefixo 'I' (ex: `IParticipant`, `IEventDetails`)
- Types: PascalCase (ex: `ParticipantResponse`, `EventStatus`)

## Estrutura de Arquivos

```
projeto-credenciamento/
├── components/          # Componentes reutilizáveis
│   ├── common/         # Componentes básicos (Button, Input, etc)
│   ├── forms/          # Componentes de formulário
│   └── layout/         # Componentes de layout (Header, Footer, etc)
├── contexts/           # Contextos React
├── hooks/              # Hooks personalizados
├── lib/               # Configurações e utilitários principais
├── pages/             # Rotas e páginas
│   └── api/           # APIs serverless
├── public/            # Assets estáticos
├── services/          # Serviços e chamadas API
├── styles/            # Estilos e temas
├── types/             # Definições de tipos
└── utils/             # Funções utilitárias
```

## Padrões de Código

### Imports
Ordem de importação:
1. React e bibliotecas externas
2. Componentes
3. Hooks
4. Utilitários
5. Types
6. Estilos

Exemplo:
```typescript
// 1. React e bibliotecas
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Componentes
import { Button } from '@/components/common';
import { Header } from '@/components/layout';

// 3. Hooks
import { useParticipant } from '@/hooks';

// 4. Utilitários
import { formatCPF } from '@/utils';

// 5. Types
import type { Participant } from '@/types';

// 6. Estilos
import '@/styles/components.css';
```

### Componentes
- Um componente por arquivo
- Uso de TypeScript com tipos explícitos
- Props interface no mesmo arquivo
- Exportação nomeada (não default)

Exemplo:
```typescript
import { FC } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  onClick,
  children
}) => {
  // ...
};
```

### Hooks
- Um hook por arquivo
- Nome descritivo começando com 'use'
- Tipos explícitos para parâmetros e retorno

### APIs
- Validação de método HTTP
- Tratamento de erros consistente
- Tipagem de request/response
- Respostas padronizadas

### Estilos
- Uso de Tailwind com classes organizadas
- Variáveis CSS para temas
- Componentes com estilos modulares