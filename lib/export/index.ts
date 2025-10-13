/**
 * Export Module
 * 
 * Central export point for all export-related functionality.
 * Provides unified interface for exporting data to Excel, PDF, and CSV formats.
 * 
 * @module lib/export
 */

// Export all from sub-modules
export * from './anonymize';
export * from './excel';
export * from './pdf';

import { exportToExcel, ExcelExportOptions, generateExcelFilename, getExcelMimeType } from './excel';
import { exportToPDF, exportToPDFWithSummary, PDFExportOptions, generatePDFFilename, getPDFMimeType } from './pdf';
import { anonymizeRecords, AnonymizableData } from './anonymize';

/**
 * Unified export configuration
 */
export interface ExportConfig {
  /** Export format */
  format: 'excel' | 'pdf';
  /** Anonymize data */
  anonymize?: boolean;
  /** Data to export */
  data: Record<string, any>[];
  /** Export options */
  options?: ExcelExportOptions | PDFExportOptions;
}

/**
 * Unified export function
 * 
 * @example
 * ```typescript
 * const buffer = await exportData({
 *   format: 'excel',
 *   anonymize: true,
 *   data: participants,
 *   options: {
 *     title: 'Participantes',
 *     columns: [...],
 *   },
 * });
 * ```
 */
export async function exportData(config: ExportConfig): Promise<Buffer> {
  const { format, anonymize = false, data, options = {} } = config;

  if (format === 'excel') {
    return exportToExcel(data, { ...options, anonymize } as ExcelExportOptions);
  }

  if (format === 'pdf') {
    return exportToPDF(data, { ...options, anonymize } as PDFExportOptions);
  }

  throw new Error(`Unsupported export format: ${format}`);
}

/**
 * Generate appropriate filename based on format
 */
export function generateFilename(baseName: string, format: 'excel' | 'pdf', includeTimestamp: boolean = true): string {
  if (format === 'excel') {
    return generateExcelFilename(baseName, includeTimestamp);
  }

  if (format === 'pdf') {
    return generatePDFFilename(baseName, includeTimestamp);
  }

  throw new Error(`Unsupported export format: ${format}`);
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: 'excel' | 'pdf'): string {
  if (format === 'excel') {
    return getExcelMimeType();
  }

  if (format === 'pdf') {
    return getPDFMimeType();
  }

  throw new Error(`Unsupported export format: ${format}`);
}

/**
 * Create response headers for file download
 */
export function createDownloadHeaders(filename: string, mimeType: string): Record<string, string> {
  return {
    'Content-Type': mimeType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache',
  };
}

/**
 * Utility: Export events data
 */
export async function exportEvents(
  events: any[],
  format: 'excel' | 'pdf',
  anonymize: boolean = false
): Promise<Buffer> {
  return exportData({
    format,
    anonymize,
    data: events,
    options: {
      title: 'Relatório de Eventos',
      subtitle: `Total de eventos: ${events.length}`,
      columns: [
        { key: 'nome', label: 'Nome do Evento' },
        { key: 'data_inicio', label: 'Data Início' },
        { key: 'local', label: 'Local' },
        { key: 'modalidade', label: 'Modalidade' },
        { key: 'status', label: 'Status' },
        { key: 'capacidade', label: 'Capacidade' },
      ],
    },
  });
}

/**
 * Utility: Export participants data
 */
export async function exportParticipants(
  participants: any[],
  format: 'excel' | 'pdf',
  anonymize: boolean = false
): Promise<Buffer> {
  return exportData({
    format,
    anonymize,
    data: participants,
    options: {
      title: 'Relatório de Participantes',
      subtitle: `Total de participantes: ${participants.length}`,
      columns: [
        { key: 'nome', label: 'Nome' },
        { key: 'email', label: 'Email' },
        { key: 'cpf', label: 'CPF' },
        { key: 'telefone', label: 'Telefone' },
        { key: 'empresa', label: 'Empresa' },
        { key: 'status_credenciamento', label: 'Status' },
      ],
    },
  });
}

/**
 * Utility: Export with statistics
 */
export async function exportWithStats<T extends Record<string, any>>(
  data: T[],
  stats: Record<string, string | number>,
  format: 'excel' | 'pdf',
  options: Partial<ExportConfig['options']> = {}
): Promise<Buffer> {
  if (format === 'pdf') {
    return exportToPDFWithSummary(data, stats, options as PDFExportOptions);
  }

  // For Excel, we can add stats as a separate sheet or section
  return exportToExcel(data, options as ExcelExportOptions);
}
