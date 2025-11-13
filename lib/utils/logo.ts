/**
 * Logo Utilities
 *
 * Provides functions to load and convert the Sebrae logo for use in PDFs and exports.
 *
 * @module lib/utils/logo
 */

import fs from 'fs';
import path from 'path';

/**
 * Get logo as base64 string for PDF embedding
 *
 * @param variant - Logo variant: 'white' for dark backgrounds, 'blue' for light backgrounds
 * @returns Base64 encoded logo image
 */
export function getLogoBase64(variant: 'white' | 'blue' = 'blue'): string {
  try {
    const logoFileName = variant === 'white' ? 'sebrae-logo-white.png' : 'logo-sebrae-blue.png';
    const logoPath = path.join(process.cwd(), 'public', logoFileName);

    if (!fs.existsSync(logoPath)) {
      console.warn('[LOGO] Logo file not found at:', logoPath);
      return '';
    }

    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');

    return `data:image/png;base64,${logoBase64}`;
  } catch (error) {
    console.error('[LOGO] Error reading logo file:', error);
    return '';
  }
}

/**
 * Get logo dimensions for PDF layout
 *
 * @returns Logo dimensions in mm for PDF
 */
export function getLogoDimensions(): { width: number; height: number } {
  // Default dimensions for Sebrae logo in PDF (maintaining aspect ratio)
  return {
    width: 35, // mm
    height: 12, // mm
  };
}

/**
 * Add logo to PDF document header
 *
 * @param doc - jsPDF document instance
 * @param xPosition - X position in mm
 * @param yPosition - Y position in mm
 * @param options - Optional width, height, and variant override
 */
export function addLogoToPDF(
  doc: any,
  xPosition: number = 15,
  yPosition: number = 10,
  options?: { width?: number; height?: number; variant?: 'white' | 'blue' }
): number {
  try {
    const logoBase64 = getLogoBase64(options?.variant || 'blue');

    if (!logoBase64) {
      console.warn('[LOGO] No logo available, skipping logo insertion');
      return yPosition;
    }

    const dimensions = getLogoDimensions();
    const width = options?.width || dimensions.width;
    const height = options?.height || dimensions.height;

    doc.addImage(logoBase64, 'PNG', xPosition, yPosition, width, height);

    return yPosition + height + 5; // Return new Y position after logo
  } catch (error) {
    console.error('[LOGO] Error adding logo to PDF:', error);
    return yPosition;
  }
}
