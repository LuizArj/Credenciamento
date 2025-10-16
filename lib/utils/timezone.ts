/**
 * Utilitário para trabalhar com timezone GMT-4 (Amazonas/Manaus)
 */

/**
 * Retorna a data/hora atual em GMT-4 no formato ISO 8601
 * @returns {string} Data/hora em formato ISO (ex: "2024-10-16T10:30:00.000-04:00")
 */
export function getCurrentDateTimeGMT4(): string {
  const now = new Date();

  // Converte para GMT-4 (subtraindo 4 horas do UTC)
  const gmt4Offset = -4 * 60; // -4 horas em minutos
  const localOffset = now.getTimezoneOffset(); // offset local em minutos
  const totalOffset = gmt4Offset - localOffset;

  const gmt4Date = new Date(now.getTime() + totalOffset * 60 * 1000);

  // Formata manualmente para ISO com timezone -04:00
  const year = gmt4Date.getFullYear();
  const month = String(gmt4Date.getMonth() + 1).padStart(2, '0');
  const day = String(gmt4Date.getDate()).padStart(2, '0');
  const hours = String(gmt4Date.getHours()).padStart(2, '0');
  const minutes = String(gmt4Date.getMinutes()).padStart(2, '0');
  const seconds = String(gmt4Date.getSeconds()).padStart(2, '0');
  const milliseconds = String(gmt4Date.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}-04:00`;
}

/**
 * Converte uma data UTC para GMT-4
 * @param {Date} date - Data em UTC
 * @returns {string} Data/hora em formato ISO com timezone GMT-4
 */
export function convertToGMT4(date: Date): string {
  const gmt4Offset = -4 * 60; // -4 horas em minutos
  const localOffset = date.getTimezoneOffset();
  const totalOffset = gmt4Offset - localOffset;

  const gmt4Date = new Date(date.getTime() + totalOffset * 60 * 1000);

  const year = gmt4Date.getFullYear();
  const month = String(gmt4Date.getMonth() + 1).padStart(2, '0');
  const day = String(gmt4Date.getDate()).padStart(2, '0');
  const hours = String(gmt4Date.getHours()).padStart(2, '0');
  const minutes = String(gmt4Date.getMinutes()).padStart(2, '0');
  const seconds = String(gmt4Date.getSeconds()).padStart(2, '0');
  const milliseconds = String(gmt4Date.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}-04:00`;
}

/**
 * Formata uma data GMT-4 para exibição em formato brasileiro
 * @param {string} isoDate - Data em formato ISO
 * @returns {string} Data formatada (ex: "16/10/2024 10:30:00")
 */
export function formatGMT4ToBR(isoDate: string): string {
  const date = new Date(isoDate);

  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Manaus', // GMT-4
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
