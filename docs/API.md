# Documentação das APIs

## Endpoints

### POST `/api/search-participant`

Busca informações de um participante no SAS e CPE.

#### Request
```typescript
interface SearchParticipantRequest {
  cpf: string; // CPF sem formatação
}
```

#### Response
```typescript
interface SearchParticipantResponse {
  source: 'sas' | 'cpe' | 'manual';
  cpf: string;
  name: string;
  email: string;
  phone: string;
  situacao?: string;
  rawData?: any;
  company?: {
    cnpj: string;
    razaoSocial: string;
    cargo?: string;
  };
  ListaVinculo?: Array<any>;
}
```

#### Erros
- `400`: CPF inválido ou não fornecido
- `404`: Participante não encontrado
- `500`: Erro interno do servidor

---

### POST `/api/process-credenciamento`

Processa o credenciamento de um participante em um evento.

#### Request
```typescript
interface CredenciamentoRequest {
  participant: {
    cpf: string;
    name: string;
    email: string;
    phone: string;
    source: string;
    CodParceiro?: string;
  };
  event: {
    id: string;
    nome: string;
    [key: string]: any;
  };
  attendant: {
    name: string;
  };
  company?: {
    cnpj: string;
    razaoSocial: string;
    cargo?: string;
  };
  companyRelation?: string;
  registrationTimestamp: string;
}
```

#### Response
```typescript
interface CredenciamentoResponse {
  success: boolean;
  message: string;
  registrationId?: string;
}
```

#### Erros
- `400`: Dados inválidos ou incompletos
- `401`: Não autorizado
- `500`: Erro interno do servidor

---

### POST `/api/search-company`

Busca informações de uma empresa pelo CNPJ.

#### Request
```typescript
interface SearchCompanyRequest {
  cnpj: string; // CNPJ sem formatação
}
```

#### Response
```typescript
interface SearchCompanyResponse {
  cnpj: string;
  razaoSocial: string;
  telefone?: string;
  email?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
}
```

#### Erros
- `400`: CNPJ inválido ou não fornecido
- `404`: Empresa não encontrada
- `500`: Erro interno do servidor

---

### GET `/api/sas-events`

Busca eventos do SAS por código e período.

#### Query Parameters
```typescript
interface SasEventsQuery {
  codEvento: string;
  periodoInicial: string; // formato: DD/MM/YYYY
  periodoFinal: string; // formato: DD/MM/YYYY
}
```

#### Response
```typescript
interface SasEvent {
  id: string;
  nome: string;
  dataEvento: string;
  local?: string;
  status?: string;
  [key: string]: any;
}

type SasEventsResponse = SasEvent[];
```

#### Erros
- `400`: Parâmetros inválidos ou não fornecidos
- `401`: Não autorizado
- `500`: Erro interno do servidor

## Autenticação

Todas as APIs requerem autenticação via token JWT no header:

```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## Rate Limiting

- Limite: 50 requisições por minuto por IP
- Resposta 429 quando excedido

## Validações

### CPF
- Deve conter 11 dígitos
- Validação do dígito verificador
- Formatação automática

### CNPJ
- Deve conter 14 dígitos
- Validação do dígito verificador
- Formatação automática

### Email
- Formato válido
- Máximo 255 caracteres

### Telefone
- 10 ou 11 dígitos
- Formatação automática

## Webhooks

O sistema envia dados de credenciamento para:
```
https://n8nhook.rr.sebrae.com.br/webhook/Credenciamento_checkin_sistema
```

### Payload
```typescript
interface WebhookPayload {
  participant: ParticipantData;
  event: EventData;
  attendant: AttendantData;
  company?: CompanyData;
  companyRelation?: string;
  registrationTimestamp: string;
}
```

## Tratamento de Erros

Todas as APIs retornam erros no formato:

```typescript
interface ApiError {
  error: string;
  message: string;
  details?: any;
}
```

## Cache

- Respostas de busca são cacheadas por 5 minutos
- Cache invalidado após credenciamento
- Headers de cache apropriados