/**
 * Participant Schema
 * 
 * @description Schemas de validação para participantes usando Zod
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// PARTICIPANT SCHEMAS
// ============================================================================

export const participantSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos'),
  telefone: z.string().optional(),
  empresa: z.string().optional(),
  cargo: z.string().optional(),
  vinculo: z.string().optional(),
  categoria: z.string().optional(),
  status_credenciamento: z.enum(['pending', 'credentialed', 'cancelled', 'no_show']).default('pending'),
  credenciado_em: z.string().datetime().optional(),
  credenciado_por: z.string().optional(),
  checked_in: z.boolean().default(false),
  checked_in_at: z.string().datetime().optional(),
  source: z.enum(['sas', 'cpe', '4events', 'manual', 'local']).default('manual'),
  observacoes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const participantCreateSchema = participantSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  credenciado_em: true,
  checked_in_at: true,
});

export const participantUpdateSchema = participantSchema.partial().required({ id: true });

export const participantFilterSchema = z.object({
  search: z.string().optional(),
  event_id: z.string().uuid().optional(),
  status_credenciamento: z.enum(['pending', 'credentialed', 'cancelled', 'no_show', 'all']).optional(),
  source: z.enum(['sas', 'cpe', '4events', 'manual', 'local', 'all']).optional(),
  checked_in: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  orderBy: z.enum(['nome', 'email', 'created_at', 'credenciado_em']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const sasParticipantSchema = z.object({
  cpf: z.string(),
  nome: z.string(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  empresa: z.string().optional(),
  cargo: z.string().optional(),
  vinculo: z.string().optional(),
  categoria: z.string().optional(),
  status: z.string().optional(),
});

export const participantReportQuerySchema = z.object({
  participantId: z.string().uuid(),
  includeEvents: z.boolean().default(true),
  includeHistory: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const bulkImportParticipantSchema = z.object({
  event_id: z.string().uuid(),
  participants: z.array(participantCreateSchema),
  overwrite: z.boolean().default(false),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Participant = z.infer<typeof participantSchema>;
export type ParticipantCreate = z.infer<typeof participantCreateSchema>;
export type ParticipantUpdate = z.infer<typeof participantUpdateSchema>;
export type ParticipantFilter = z.infer<typeof participantFilterSchema>;
export type SASParticipant = z.infer<typeof sasParticipantSchema>;
export type ParticipantReportQuery = z.infer<typeof participantReportQuerySchema>;
export type BulkImportParticipant = z.infer<typeof bulkImportParticipantSchema>;
