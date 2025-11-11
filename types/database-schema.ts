/**
 * Database Schema Documentation
 *
 * Este arquivo documenta o schema real do banco de dados PostgreSQL
 * para facilitar o desenvolvimento e manutenção do código.
 *
 * IMPORTANTE: Este é o schema REAL do banco. Não usar campos que não existem aqui.
 *
 * @module types/database-schema
 */

/**
 * Tabela: companies
 * Armazena informações sobre empresas
 */
export interface CompaniesTable {
  id: string; // UUID, PK
  cnpj: string; // UNIQUE
  razao_social: string;
  nome_fantasia: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  ativo: boolean; // DEFAULT true
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

/**
 * Tabela: events
 * Armazena informações sobre eventos
 */
export interface EventsTable {
  id: string; // UUID, PK
  nome: string;
  descricao: string | null;
  data_inicio: string; // timestamp
  data_fim: string | null; // timestamp
  local: string;
  endereco: string | null;
  capacidade: number | null;
  modalidade: string | null; // presencial, online, hibrido
  tipo_evento: string | null; // evento_sas, evento_local, curso, workshop, palestra
  publico_alvo: string | null;
  gerente: string | null;
  coordenador: string | null;
  solucao: string | null;
  unidade: string | null;
  tipo_acao: string | null;
  status: string; // active, inactive, cancelled, completed
  meta_participantes: number | null;
  observacoes: string | null;
  ativo: boolean; // DEFAULT true
  created_at: string; // timestamp
  updated_at: string; // timestamp
  codevento_sas: string | null; // Código do evento no sistema SAS
}

/**
 * Tabela: participants
 * Armazena informações sobre participantes
 *
 * IMPORTANTE: Esta tabela NÃO tem campos de status de credenciamento ou event_id.
 * O relacionamento com eventos é feito através da tabela registrations.
 */
export interface ParticipantsTable {
  id: string; // UUID, PK
  cpf: string; // UNIQUE
  nome: string;
  email: string;
  telefone: string | null;
  data_nascimento: string | null; // date
  genero: string | null;
  escolaridade: string | null;
  profissao: string | null;
  cargo: string | null;
  endereco: string | null;
  fonte: string | null; // sas, local, manual
  company_id: string | null; // FK -> companies.id
  observacoes: string | null;
  ativo: boolean; // DEFAULT true
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

/**
 * Tabela: registrations
 * Relaciona participantes com eventos (inscrições)
 *
 * IMPORTANTE: Esta é a tabela central que conecta participants e events.
 * O status da inscrição fica AQUI, não na tabela participants.
 */
export interface RegistrationsTable {
  id: string; // UUID, PK
  event_id: string; // FK -> events.id
  participant_id: string; // FK -> participants.id
  ticket_category_id: string | null; // FK -> ticket_categories.id
  data_inscricao: string; // timestamp, DEFAULT now()
  status: 'registered' | 'confirmed' | 'checked_in' | 'cancelled' | 'no_show'; // CHECK constraint
  forma_pagamento: string | null;
  valor_pago: number | null; // decimal
  codigo_inscricao: string | null; // UNIQUE
  dados_adicionais: Record<string, any> | null; // jsonb
  observacoes: string | null;
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

/**
 * Tabela: check_ins
 * Registra os check-ins dos participantes nos eventos
 *
 * IMPORTANTE: Check-in está relacionado com registrations, não diretamente com participants.
 */
export interface CheckInsTable {
  id: string; // UUID, PK
  registration_id: string; // FK -> registrations.id, UNIQUE
  data_check_in: string; // timestamp, DEFAULT now()
  responsavel_credenciamento: string | null;
  observacoes: string | null;
  created_at: string; // timestamp
}

/**
 * Tabela: ticket_categories
 * Categorias de ingressos para eventos
 */
export interface TicketCategoriesTable {
  id: string; // UUID, PK
  event_id: string; // FK -> events.id
  nome: string;
  descricao: string | null;
  preco: number; // decimal
  quantidade_disponivel: number;
  quantidade_vendida: number; // DEFAULT 0
  data_inicio_venda: string | null; // timestamp
  data_fim_venda: string | null; // timestamp
  ativo: boolean; // DEFAULT true
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

/**
 * Relacionamentos do Schema
 *
 * companies
 *   └─> participants (company_id)
 *
 * events
 *   ├─> registrations (event_id)
 *   └─> ticket_categories (event_id)
 *
 * participants
 *   └─> registrations (participant_id)
 *
 * registrations
 *   ├─> check_ins (registration_id)
 *   └─> ticket_categories (ticket_category_id)
 *
 * IMPORTANTE: Para buscar participantes de um evento:
 *   SELECT p.* FROM participants p
 *   INNER JOIN registrations r ON r.participant_id = p.id
 *   WHERE r.event_id = '...'
 *
 * Para verificar se um participante fez check-in:
 *   SELECT ci.* FROM check_ins ci
 *   INNER JOIN registrations r ON r.id = ci.registration_id
 *   WHERE r.participant_id = '...' AND r.event_id = '...'
 */

/**
 * Mapeamento de Status
 *
 * registrations.status:
 * - registered: Participante inscrito, aguardando confirmação
 * - confirmed: Inscrição confirmada (equivalente a "credencialed" no código antigo)
 * - checked_in: Participante fez check-in no evento
 * - cancelled: Inscrição cancelada
 * - no_show: Participante não compareceu
 *
 * Para compatibilidade com código legado que usa "status_credenciamento":
 * - credentialed -> confirmed ou checked_in
 * - pending -> registered
 * - cancelled -> cancelled
 */

export type RegistrationStatus =
  | 'registered'
  | 'confirmed'
  | 'checked_in'
  | 'cancelled'
  | 'no_show';

export const STATUS_MAP = {
  // Código legado -> Schema real
  credentialed: 'confirmed',
  pending: 'registered',
  cancelled: 'cancelled',
  // Schema real -> Código legado
  confirmed: 'credentialed',
  checked_in: 'credentialed',
  registered: 'pending',
} as const;
