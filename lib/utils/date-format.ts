/**
 * Date Formatting Utilities
 *
 * Utilitários para formatação de datas sem conversão de timezone.
 * As datas do SAS já vêm no formato correto (GMT-4), então apenas
 * precisamos formatar para exibição sem aplicar conversões.
 *
 * @module lib/utils/date-format
 */

/**
 * Formata uma data ISO string para formato brasileiro (DD/MM/AAAA)
 * sem aplicar conversão de timezone.
 *
 * IMPORTANTE: Usa UTC para evitar conversão de timezone do navegador.
 * As datas do SAS já estão no timezone correto (GMT-4).
 *
 * @param {string} isoDate - Data no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
 * @returns {string} Data formatada como DD/MM/AAAA
 *
 * @example
 * formatDateBR('2025-10-14') // '14/10/2025'
 * formatDateBR('2025-10-14T10:30:00') // '14/10/2025'
 */
export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '';

  // Extrair apenas a parte da data (YYYY-MM-DD)
  const dateOnly = isoDate.split('T')[0];
  const [year, month, day] = dateOnly.split('-');

  // Retornar diretamente sem criar objeto Date
  // Isso evita qualquer conversão de timezone
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data ISO string para formato brasileiro com hora (DD/MM/AAAA HH:mm)
 * sem aplicar conversão de timezone.
 *
 * @param {string} isoDateTime - Data/hora no formato ISO
 * @returns {string} Data/hora formatada como DD/MM/AAAA HH:mm
 *
 * @example
 * formatDateTimeBR('2025-10-14T10:30:00') // '14/10/2025 10:30'
 */
export function formatDateTimeBR(isoDateTime: string): string {
  if (!isoDateTime) return '';

  const [datePart, timePart] = isoDateTime.split('T');
  const [year, month, day] = datePart.split('-');

  if (timePart) {
    const [hour, minute] = timePart.split(':');
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data para exibição em input type="date"
 * Retorna no formato YYYY-MM-DD sem conversão de timezone.
 *
 * @param {string} isoDate - Data no formato ISO
 * @returns {string} Data no formato YYYY-MM-DD
 *
 * @example
 * formatDateForInput('2025-10-14T10:30:00') // '2025-10-14'
 */
export function formatDateForInput(isoDate: string): string {
  if (!isoDate) return '';
  return isoDate.split('T')[0];
}

/**
 * Converte data brasileira (DD/MM/AAAA) para formato ISO (YYYY-MM-DD)
 *
 * @param {string} brDate - Data no formato DD/MM/AAAA
 * @returns {string} Data no formato YYYY-MM-DD
 *
 * @example
 * brDateToISO('14/10/2025') // '2025-10-14'
 */
export function brDateToISO(brDate: string): string {
  if (!brDate) return '';

  const [day, month, year] = brDate.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica se uma data está no passado (sem considerar hora)
 *
 * @param {string} isoDate - Data no formato ISO
 * @returns {boolean} True se a data é anterior a hoje
 */
export function isDateInPast(isoDate: string): boolean {
  if (!isoDate) return false;

  const dateOnly = isoDate.split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  return dateOnly < today;
}

/**
 * Compara duas datas (sem considerar hora)
 *
 * @param {string} date1 - Primeira data ISO
 * @param {string} date2 - Segunda data ISO
 * @returns {number} -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export function compareDates(date1: string, date2: string): number {
  if (!date1 || !date2) return 0;

  const d1 = date1.split('T')[0];
  const d2 = date2.split('T')[0];

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * Calcula a diferença em dias entre duas datas
 *
 * @param {string} startDate - Data inicial ISO
 * @param {string} endDate - Data final ISO
 * @returns {number} Número de dias entre as datas
 */
export function daysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate.split('T')[0]);
  const end = new Date(endDate.split('T')[0]);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Formata período de datas para exibição
 *
 * @param {string} startDate - Data inicial ISO
 * @param {string} endDate - Data final ISO
 * @returns {string} Período formatado
 *
 * @example
 * formatDateRange('2025-10-14', '2025-10-16') // '14/10/2025 a 16/10/2025'
 * formatDateRange('2025-10-14', '2025-10-14') // '14/10/2025'
 */
export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate) return '';

  const start = formatDateBR(startDate);

  if (!endDate || startDate === endDate) {
    return start;
  }

  const end = formatDateBR(endDate);
  return `${start} a ${end}`;
}
