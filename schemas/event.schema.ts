/**
 * Event Schema
 * 
 * @description Schemas de validação para eventos usando Zod
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// EVENT SCHEMAS
// ============================================================================

export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  descricao: z.string().optional(),
  data_inicio: z.string().datetime().or(z.date()),
  data_fim: z.string().datetime().or(z.date()).optional(),
  local: z.string().min(3, 'Local deve ter no mínimo 3 caracteres'),
  capacidade: z.number().int().positive().optional(),
  minimo_participantes: z.number().int().positive().optional(),
  modalidade: z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDO']).default('PRESENCIAL'),
  status: z.enum(['active', 'inactive', 'cancelled', 'completed']).default('active'),
  tipo_evento: z.string().optional(),
  publico_alvo: z.string().optional(),
  gerente: z.string().optional(),
  coordenador: z.string().optional(),
  solucao: z.string().optional(),
  unidade: z.string().optional(),
  tipo_acao: z.string().optional(),
  codevento_sas: z.string().optional(),
  carga_horaria: z.number().positive().optional(),
  preco: z.number().nonnegative().optional(),
  gratuito: z.boolean().default(true),
  projeto: z.string().optional(),
  instrumento: z.string().optional(),
  vagas_disponiveis: z.number().int().nonnegative().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const eventCreateSchema = eventSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const eventUpdateSchema = eventSchema.partial().required({ id: true });

export const eventFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'cancelled', 'completed', 'all']).optional(),
  modalidade: z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDO', 'all']).optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  orderBy: z.enum(['nome', 'data_inicio', 'created_at']).default('data_inicio'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const sasEventSchema = z.object({
  codevento: z.string(),
  nome: z.string(),
  descricao: z.string().optional(),
  data_inicio: z.string(),
  data_fim: z.string().optional(),
  local: z.string(),
  modalidade: z.string().optional(),
  tipo_evento: z.string().optional(),
  instrumento: z.string().optional(),
  capacidade: z.number().optional(),
  minimo_participantes: z.number().optional(),
  maximo_participantes: z.number().optional(),
  carga_horaria: z.number().optional(),
  preco: z.number().optional(),
  gratuito: z.boolean().optional(),
  status: z.string().optional(),
  publico_alvo: z.string().optional(),
  gerente: z.string().optional(),
  coordenador: z.string().optional(),
  solucao: z.string().optional(),
  unidade: z.string().optional(),
  codigo_projeto: z.string().optional(),
  vagas_disponiveis: z.number().optional(),
});

export const eventReportQuerySchema = z.object({
  eventId: z.string().uuid(),
  includeParticipants: z.boolean().default(true),
  includeStats: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Event = z.infer<typeof eventSchema>;
export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
export type EventFilter = z.infer<typeof eventFilterSchema>;
export type SASEvent = z.infer<typeof sasEventSchema>;
export type EventReportQuery = z.infer<typeof eventReportQuerySchema>;
