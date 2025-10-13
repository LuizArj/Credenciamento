/**
 * Excel Export Utilities
 * 
 * Provides functions to export data to Excel (.xlsx) format using ExcelJS.
 * Supports data formatting, styling, and anonymization.
 * 
 * @module lib/export/excel
 */

import ExcelJS from 'exceljs';
import { anonymizeRecords } from './anonymize';
import { MIME_TYPES } from '../../constants/export';

export interface ExcelExportOptions {
  /** Sheet name */
  sheetName?: string;
  /** Anonymize sensitive data */
  anonymize?: boolean;
  /** Custom column definitions */
  columns?: Array<{ key: string; label: string; width?: number }>;
  /** Title row text */
  title?: string;
  /** Subtitle row text */
  subtitle?: string;
  /** Include filters */
  autoFilter?: boolean;
  /** Freeze first row */
  freezeHeader?: boolean;
}

/**
 * Export data to Excel buffer
 */
export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExcelExportOptions = {}
): Promise<Buffer> {
  const {
    sheetName = 'Dados',
    anonymize = false,
    columns,
    title,
    subtitle,
    autoFilter = true,
    freezeHeader = true,
  } = options;

  // Anonymize data if requested
  const processedData = anonymize ? anonymizeRecords(data) : data;

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  let currentRow = 1;

  // Add title if provided
  if (title) {
    const titleRow = worksheet.getRow(currentRow);
    titleRow.values = [title];
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F4788' } };
    titleRow.height = 25;
    worksheet.mergeCells(currentRow, 1, currentRow, columns?.length || Object.keys(processedData[0] || {}).length);
    currentRow++;
  }

  // Add subtitle if provided
  if (subtitle) {
    const subtitleRow = worksheet.getRow(currentRow);
    subtitleRow.values = [subtitle];
    subtitleRow.font = { size: 12, color: { argb: 'FF666666' } };
    subtitleRow.height = 20;
    worksheet.mergeCells(
      currentRow,
      1,
      currentRow,
      columns?.length || Object.keys(processedData[0] || {}).length
    );
    currentRow++;
    currentRow++; // Empty row
  }

  // Define columns
  const headerRow = currentRow;
  if (columns && columns.length > 0) {
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: col.width || 15,
    }));
  } else if (processedData.length > 0) {
    // Auto-generate columns from first record
    const keys = Object.keys(processedData[0]);
    worksheet.columns = keys.map((key) => ({
      header: formatHeader(key),
      key,
      width: 15,
    }));
  }

  // Style header row
  const headerRowObj = worksheet.getRow(headerRow);
  headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4788' },
  };
  headerRowObj.height = 20;
  headerRowObj.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  processedData.forEach((record) => {
    worksheet.addRow(record);
  });

  // Format data rows
  for (let i = headerRow + 1; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    row.alignment = { vertical: 'middle' };
    
    // Zebra striping
    if ((i - headerRow) % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' },
      };
    }
  }

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      };
    });
  });

  // Auto-filter
  if (autoFilter && processedData.length > 0) {
    worksheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: headerRow, column: worksheet.columnCount },
    };
  }

  // Freeze header
  if (freezeHeader) {
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRow }];
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export multiple sheets to Excel
 */
export async function exportMultipleSheets(
  sheets: Array<{
    name: string;
    data: Record<string, any>[];
    options?: ExcelExportOptions;
  }>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const {
      name,
      data,
      options = {},
    } = sheet;

    const {
      anonymize = false,
      columns,
      title,
      subtitle,
      autoFilter = true,
      freezeHeader = true,
    } = options;

    // Anonymize data if requested
    const processedData = anonymize ? anonymizeRecords(data) : data;

    const worksheet = workbook.addWorksheet(name);
    let currentRow = 1;

    // Add title
    if (title) {
      const titleRow = worksheet.getRow(currentRow);
      titleRow.values = [title];
      titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F4788' } };
      titleRow.height = 25;
      worksheet.mergeCells(currentRow, 1, currentRow, columns?.length || Object.keys(processedData[0] || {}).length);
      currentRow++;
    }

    // Add subtitle
    if (subtitle) {
      const subtitleRow = worksheet.getRow(currentRow);
      subtitleRow.values = [subtitle];
      subtitleRow.font = { size: 12, color: { argb: 'FF666666' } };
      subtitleRow.height = 20;
      worksheet.mergeCells(
        currentRow,
        1,
        currentRow,
        columns?.length || Object.keys(processedData[0] || {}).length
      );
      currentRow++;
      currentRow++;
    }

    // Define columns
    const headerRow = currentRow;
    if (columns && columns.length > 0) {
      worksheet.columns = columns.map((col) => ({
        header: col.label,
        key: col.key,
        width: col.width || 15,
      }));
    } else if (processedData.length > 0) {
      const keys = Object.keys(processedData[0]);
      worksheet.columns = keys.map((key) => ({
        header: formatHeader(key),
        key,
        width: 15,
      }));
    }

    // Style header
    const headerRowObj = worksheet.getRow(headerRow);
    headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRowObj.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4788' },
    };
    headerRowObj.height = 20;
    headerRowObj.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    processedData.forEach((record) => {
      worksheet.addRow(record);
    });

    // Format rows
    for (let i = headerRow + 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.alignment = { vertical: 'middle' };
      
      if ((i - headerRow) % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }
    }

    // Add borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        };
      });
    });

    // Auto-filter
    if (autoFilter && processedData.length > 0) {
      worksheet.autoFilter = {
        from: { row: headerRow, column: 1 },
        to: { row: headerRow, column: worksheet.columnCount },
      };
    }

    // Freeze header
    if (freezeHeader) {
      worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRow }];
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
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
 * Get MIME type for Excel
 */
export function getExcelMimeType(): string {
  return MIME_TYPES.EXCEL;
}

/**
 * Generate Excel filename
 */
export function generateExcelFilename(baseName: string, includeTimestamp: boolean = true): string {
  const timestamp = includeTimestamp ? `_${Date.now()}` : '';
  return `${baseName}${timestamp}.xlsx`;
}
