/**
 * PDF Export Utilities
 * 
 * Provides functions to export data to PDF format using jsPDF and jspdf-autotable.
 * Supports tables, formatting, and basic charts.
 * 
 * @module lib/export/pdf
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { anonymizeRecords } from './anonymize';
import { MIME_TYPES } from '../../constants/export';

export interface PDFExportOptions {
  /** Document title */
  title?: string;
  /** Document subtitle */
  subtitle?: string;
  /** Anonymize sensitive data */
  anonymize?: boolean;
  /** Custom column definitions */
  columns?: Array<{ key: string; label: string }>;
  /** Include header */
  includeHeader?: boolean;
  /** Include footer with page numbers */
  includeFooter?: boolean;
  /** Orientation */
  orientation?: 'portrait' | 'landscape';
  /** Logo URL or base64 */
  logo?: string;
}

/**
 * Export data to PDF buffer
 */
export async function exportToPDF<T extends Record<string, any>>(
  data: T[],
  options: PDFExportOptions = {}
): Promise<Buffer> {
  const {
    title = 'Relatório',
    subtitle,
    anonymize = false,
    columns,
    includeHeader = true,
    includeFooter = true,
    orientation = 'landscape',
    logo,
  } = options;

  // Anonymize data if requested
  const processedData = anonymize ? anonymizeRecords(data) : data;

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPosition = margin;

  // Add logo if provided
  if (logo && includeHeader) {
    try {
      doc.addImage(logo, 'PNG', margin, yPosition, 30, 10);
      yPosition += 15;
    } catch (err) {
      console.warn('Failed to add logo to PDF:', err);
    }
  }

  // Add title
  if (includeHeader) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 71, 136); // #1F4788
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Add subtitle
    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    // Add date
    const dateStr = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Gerado em: ${dateStr}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Prepare table data
  const tableColumns =
    columns && columns.length > 0
      ? columns.map((col) => col.label)
      : processedData.length > 0
      ? Object.keys(processedData[0]).map((key) => formatHeader(key))
      : [];

  const tableData = processedData.map((record) => {
    if (columns && columns.length > 0) {
      return columns.map((col) => formatCellValue(record[col.key]));
    }
    return Object.values(record).map((value) => formatCellValue(value));
  });

  // Add table
  autoTable(doc, {
    head: [tableColumns],
    body: tableData,
    startY: yPosition,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left',
    },
    headStyles: {
      fillColor: [31, 71, 136], // #1F4788
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    theme: 'striped',
    didDrawPage: (data) => {
      // Add footer with page number
      if (includeFooter) {
        const pageNumber = doc.getCurrentPageInfo().pageNumber;
        const totalPages = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${pageNumber} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    },
  });

  // If anonymized, add watermark
  if (anonymize) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text('Dados Anonimizados - LGPD', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
  }

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * Export data with summary section
 */
export async function exportToPDFWithSummary<T extends Record<string, any>>(
  data: T[],
  summary: Record<string, string | number>,
  options: PDFExportOptions = {}
): Promise<Buffer> {
  const {
    title = 'Relatório',
    subtitle,
    anonymize = false,
    columns,
    includeHeader = true,
    includeFooter = true,
    orientation = 'landscape',
    logo,
  } = options;

  const processedData = anonymize ? anonymizeRecords(data) : data;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPosition = margin;

  // Add header (same as exportToPDF)
  if (logo && includeHeader) {
    try {
      doc.addImage(logo, 'PNG', margin, yPosition, 30, 10);
      yPosition += 15;
    } catch (err) {
      console.warn('Failed to add logo to PDF:', err);
    }
  }

  if (includeHeader) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 71, 136);
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    const dateStr = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Gerado em: ${dateStr}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Add summary section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 71, 136);
  doc.text('Resumo', margin, yPosition);
  yPosition += 8;

  const summaryData = Object.entries(summary).map(([key, value]) => [
    formatHeader(key),
    String(value),
  ]);

  autoTable(doc, {
    body: summaryData,
    startY: yPosition,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' },
    },
    theme: 'plain',
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Add data table
  const tableColumns =
    columns && columns.length > 0
      ? columns.map((col) => col.label)
      : processedData.length > 0
      ? Object.keys(processedData[0]).map((key) => formatHeader(key))
      : [];

  const tableData = processedData.map((record) => {
    if (columns && columns.length > 0) {
      return columns.map((col) => formatCellValue(record[col.key]));
    }
    return Object.values(record).map((value) => formatCellValue(value));
  });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 71, 136);
  doc.text('Detalhes', margin, yPosition);
  yPosition += 8;

  autoTable(doc, {
    head: [tableColumns],
    body: tableData,
    startY: yPosition,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left',
    },
    headStyles: {
      fillColor: [31, 71, 136],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    theme: 'striped',
    didDrawPage: (data) => {
      if (includeFooter) {
        const pageNumber = doc.getCurrentPageInfo().pageNumber;
        const totalPages = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${pageNumber} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    },
  });

  if (anonymize) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text('Dados Anonimizados - LGPD', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * Format header label from key
 */
function formatHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Format cell value
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('pt-BR');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Get MIME type for PDF
 */
export function getPDFMimeType(): string {
  return MIME_TYPES.PDF;
}

/**
 * Generate PDF filename
 */
export function generatePDFFilename(baseName: string, includeTimestamp: boolean = true): string {
  const timestamp = includeTimestamp ? `_${Date.now()}` : '';
  return `${baseName}${timestamp}.pdf`;
}
