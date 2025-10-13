/**
 * Export Schema
 * 
 * @description Schemas de validação para exportação de dados
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

export const exportConfigSchema = z.object({
  format: z.enum(['excel', 'pdf']),
  anonymize: z.boolean().default(false),
  includeStats: z.boolean().default(true),
  includeCharts: z.boolean().default(false),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
});

export const eventExportSchema = z.object({
  eventId: z.string().uuid(),
  config: exportConfigSchema,
  includeParticipants: z.boolean().default(true),
  participantStatus: z.array(z.enum(['pending', 'credentialed', 'cancelled', 'no_show'])).optional(),
});

export const participantExportSchema = z.object({
  participantId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  config: exportConfigSchema,
  includeHistory: z.boolean().default(true),
});

export const bulkExportSchema = z.object({
  type: z.enum(['events', 'participants', 'both']),
  config: exportConfigSchema,
  filters: z.object({
    eventIds: z.array(z.string().uuid()).optional(),
    participantIds: z.array(z.string().uuid()).optional(),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
    status: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ExportConfig = z.infer<typeof exportConfigSchema>;
export type EventExport = z.infer<typeof eventExportSchema>;
export type ParticipantExport = z.infer<typeof participantExportSchema>;
export type BulkExport = z.infer<typeof bulkExportSchema>;
