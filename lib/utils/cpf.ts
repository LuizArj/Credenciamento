/**
 * CPF Utilities
 * - normalizeCPF: keep only digits and pad to 11
 * - formatCPF: mask 000.000.000-00 for display
 */

export function normalizeCPF(cpf: string | number): string {
  const digits = String(cpf ?? '')
    .replace(/\D/g, '')
    .slice(0, 11);
  return digits.padStart(11, '0');
}

export function formatCPF(cpf: string | number): string {
  const n = normalizeCPF(cpf);
  return `${n.substring(0, 3)}.${n.substring(3, 6)}.${n.substring(6, 9)}-${n.substring(9, 11)}`;
}

export function isSameCPF(a?: string, b?: string) {
  if (!a || !b) return false;
  return normalizeCPF(a) === normalizeCPF(b);
}
