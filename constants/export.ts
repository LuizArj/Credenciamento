/**
 * Export Constants
 * 
 * @description Constantes para exportação de dados
 * @version 1.0.0
 */

// ============================================================================
// EXPORT FORMATS
// ============================================================================

export const EXPORT_FORMATS = {
  EXCEL: 'excel',
  PDF: 'pdf',
} as const;

export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];

// ============================================================================
// ANONYMIZATION FIELDS
// ============================================================================

export const ANONYMIZED_FIELD_NAMES = [
  'nome',
  'email',
  'cpf',
  'cpf_cnpj',
  'telefone',
  'phone',
  'celular',
  'empresa',
  'gerente',
  'coordenador',
] as const;

export const ANONYMIZED_FIELDS = {
  PARTICIPANT: {
    nome: 'PARTICIPANTE_***',
    email: '***@***.com',
    cpf: '***.***.***-**',
    telefone: '(**) *****-****',
    empresa: 'EMPRESA_***',
  },
  EVENT: {
    gerente: 'GERENTE_***',
    coordenador: 'COORDENADOR_***',
  },
} as const;

// ============================================================================
// EXPORT COLUMNS
// ============================================================================

export const EVENT_EXPORT_COLUMNS = [
  { key: 'nome', label: 'Nome do Evento', required: true },
  { key: 'data_inicio', label: 'Data Início', required: true },
  { key: 'data_fim', label: 'Data Fim', required: false },
  { key: 'local', label: 'Local', required: true },
  { key: 'modalidade', label: 'Modalidade', required: true },
  { key: 'status', label: 'Status', required: true },
  { key: 'capacidade', label: 'Capacidade', required: false },
  { key: 'total_participantes', label: 'Total Participantes', required: false },
  { key: 'total_credenciados', label: 'Credenciados', required: false },
  { key: 'tipo_evento', label: 'Tipo', required: false },
  { key: 'publico_alvo', label: 'Público Alvo', required: false },
  { key: 'gerente', label: 'Gerente', required: false, anonymizable: true },
  { key: 'coordenador', label: 'Coordenador', required: false, anonymizable: true },
] as const;

export const PARTICIPANT_EXPORT_COLUMNS = [
  { key: 'nome', label: 'Nome', required: true, anonymizable: true },
  { key: 'email', label: 'Email', required: true, anonymizable: true },
  { key: 'cpf', label: 'CPF', required: true, anonymizable: true },
  { key: 'telefone', label: 'Telefone', required: false, anonymizable: true },
  { key: 'empresa', label: 'Empresa', required: false, anonymizable: true },
  { key: 'cargo', label: 'Cargo', required: false },
  { key: 'vinculo', label: 'Vínculo', required: false },
  { key: 'status_credenciamento', label: 'Status', required: true },
  { key: 'credenciado_em', label: 'Credenciado em', required: false },
  { key: 'checked_in', label: 'Check-in', required: false },
  { key: 'source', label: 'Origem', required: false },
] as const;

// ============================================================================
// FILE NAME PATTERNS
// ============================================================================

export const FILE_NAME_PATTERNS = {
  EVENT: 'evento_{eventName}_{date}',
  PARTICIPANT: 'participante_{participantName}_{date}',
  BULK_EVENTS: 'eventos_{date}',
  BULK_PARTICIPANTS: 'participantes_{date}',
  REPORT: 'relatorio_{type}_{date}',
} as const;

// ============================================================================
// MIME TYPES
// ============================================================================

export const MIME_TYPES = {
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF: 'application/pdf',
  CSV: 'text/csv',
} as const;

// ============================================================================
// CHART TYPES
// ============================================================================

export const CHART_TYPES = {
  BAR: 'bar',
  LINE: 'line',
  PIE: 'pie',
  AREA: 'area',
} as const;

export type ChartType = typeof CHART_TYPES[keyof typeof CHART_TYPES];
