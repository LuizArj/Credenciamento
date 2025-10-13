/**
 * Utilitários de sanitização de inputs para prevenir XSS e injeções
 * 
 * @module lib/security/sanitize
 * @description Funções para limpar e validar inputs do usuário
 */

import validator from 'validator';

/**
 * Sanitiza uma string removendo caracteres perigosos
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove tags HTML
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove caracteres de controle
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escapa caracteres especiais
  sanitized = validator.escape(sanitized);

  return sanitized.trim();
}

/**
 * Sanitiza um email
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') {
    return null;
  }

  const normalized = validator.normalizeEmail(email);
  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Sanitiza uma URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  if (!validator.isURL(url, { require_protocol: true, protocols: ['http', 'https'] })) {
    return null;
  }

  return url;
}

/**
 * Sanitiza um CPF
 */
export function sanitizeCPF(cpf: string): string {
  if (typeof cpf !== 'string') {
    return '';
  }

  // Remove tudo exceto números
  return cpf.replace(/\D/g, '');
}

/**
 * Sanitiza um CNPJ
 */
export function sanitizeCNPJ(cnpj: string): string {
  if (typeof cnpj !== 'string') {
    return '';
  }

  // Remove tudo exceto números
  return cnpj.replace(/\D/g, '');
}

/**
 * Sanitiza um telefone
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  // Remove tudo exceto números, + e -
  return phone.replace(/[^\d+-]/g, '');
}

/**
 * Sanitiza um número inteiro
 */
export function sanitizeInt(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return null;
  }
  return num;
}

/**
 * Sanitiza um número decimal
 */
export function sanitizeFloat(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
}

/**
 * Sanitiza um objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Valida e sanitiza SQL-like inputs (prevenir SQL injection)
 */
export function sanitizeSQLInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove caracteres perigosos para SQL
  const dangerous = /['";\\]/g;
  return input.replace(dangerous, '').trim();
}

/**
 * Valida se uma string é alfanumérica
 */
export function isAlphanumeric(input: string): boolean {
  return validator.isAlphanumeric(input, 'pt-BR');
}

/**
 * Limita o tamanho de uma string
 */
export function limitString(input: string, maxLength: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input.slice(0, maxLength);
}

/**
 * Sanitiza nome de arquivo
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return '';
  }

  // Remove path traversal
  let sanitized = filename.replace(/\.\./g, '');

  // Remove caracteres especiais exceto ponto, hífen e underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limita tamanho
  sanitized = limitString(sanitized, 255);

  return sanitized;
}

/**
 * Valida formato de data ISO
 */
export function sanitizeISODate(date: string): string | null {
  if (typeof date !== 'string') {
    return null;
  }

  if (!validator.isISO8601(date)) {
    return null;
  }

  return date;
}

/**
 * Remove HTML e scripts de uma string (mais agressivo)
 */
export function stripHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove tags HTML
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Remove event handlers
  cleaned = cleaned.replace(/on\w+="[^"]*"/g, '');
  cleaned = cleaned.replace(/on\w+='[^']*'/g, '');

  // Remove javascript: URLs
  cleaned = cleaned.replace(/javascript:/gi, '');

  return cleaned;
}
