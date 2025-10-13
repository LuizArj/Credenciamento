/**
 * Data Anonymization Utilities
 * 
 * Provides functions to anonymize sensitive personal data in exports.
 * Follows LGPD (Lei Geral de Proteção de Dados) guidelines.
 * 
 * @module lib/export/anonymize
 */

import { ANONYMIZED_FIELD_NAMES } from '../../constants/export';

export interface AnonymizableData {
  [key: string]: any;
}

const DEFAULT_FIELDS_TO_ANONYMIZE = Array.from(ANONYMIZED_FIELD_NAMES);

/**
 * Anonymize sensitive fields in a single record
 */
export function anonymizeRecord<T extends AnonymizableData>(
  record: T,
  fieldsToAnonymize: string[] = DEFAULT_FIELDS_TO_ANONYMIZE
): T {
  const anonymized = { ...record };

  fieldsToAnonymize.forEach((field) => {
    if (field in anonymized) {
      anonymized[field as keyof T] = anonymizeValue(anonymized[field], field) as T[keyof T];
    }
  });

  return anonymized;
}

/**
 * Anonymize sensitive fields in an array of records
 */
export function anonymizeRecords<T extends AnonymizableData>(
  records: T[],
  fieldsToAnonymize: string[] = DEFAULT_FIELDS_TO_ANONYMIZE
): T[] {
  return records.map((record) => anonymizeRecord(record, fieldsToAnonymize));
}

/**
 * Anonymize a single value based on field type
 */
export function anonymizeValue(value: any, fieldName: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // CPF/CNPJ - keep first 3 and last 2 digits
  if (fieldName.toLowerCase().includes('cpf') || fieldName.toLowerCase().includes('cnpj')) {
    return anonymizeCPF(stringValue);
  }

  // Email - keep domain, anonymize local part
  if (fieldName.toLowerCase().includes('email') || fieldName.toLowerCase().includes('e-mail')) {
    return anonymizeEmail(stringValue);
  }

  // Phone - keep area code, anonymize number
  if (
    fieldName.toLowerCase().includes('telefone') ||
    fieldName.toLowerCase().includes('phone') ||
    fieldName.toLowerCase().includes('celular')
  ) {
    return anonymizePhone(stringValue);
  }

  // Generic anonymization for other fields
  return anonymizeGeneric(stringValue);
}

/**
 * Anonymize CPF: 123.***.***-89
 */
function anonymizeCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // CPF
    return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(-2)}`;
  } else if (cleaned.length === 14) {
    // CNPJ
    return `${cleaned.slice(0, 2)}.***.***/${cleaned.slice(8, 12)}-${cleaned.slice(-2)}`;
  }

  // If not valid format, return generic anonymization
  return '***.***/***-**';
}

/**
 * Anonymize Email: u***@domain.com
 */
function anonymizeEmail(email: string): string {
  const parts = email.split('@');

  if (parts.length !== 2) {
    return '***@***.***';
  }

  const [local, domain] = parts;

  if (local.length <= 1) {
    return `*@${domain}`;
  }

  if (local.length <= 3) {
    return `${local[0]}*@${domain}`;
  }

  return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
}

/**
 * Anonymize Phone: (11) ****-**34
 */
function anonymizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    // Landline: (11) ****-1234
    return `(${cleaned.slice(0, 2)}) ****-${cleaned.slice(-4)}`;
  } else if (cleaned.length === 11) {
    // Mobile: (11) 9****-**34
    return `(${cleaned.slice(0, 2)}) ${cleaned[2]}****-**${cleaned.slice(-2)}`;
  }

  return '(**) *****-****';
}

/**
 * Generic anonymization: keep first and last char
 */
function anonymizeGeneric(value: string): string {
  if (value.length <= 2) {
    return '*'.repeat(value.length);
  }

  if (value.length <= 4) {
    return `${value[0]}${'*'.repeat(value.length - 1)}`;
  }

  return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
}

/**
 * Check if a field should be anonymized
 */
export function shouldAnonymize(fieldName: string, fieldsToAnonymize: string[] = DEFAULT_FIELDS_TO_ANONYMIZE): boolean {
  return fieldsToAnonymize.some((field) => fieldName.toLowerCase().includes(field.toLowerCase()));
}

/**
 * Anonymize nested objects recursively
 */
export function anonymizeNested<T extends AnonymizableData>(
  data: T,
  fieldsToAnonymize: string[] = DEFAULT_FIELDS_TO_ANONYMIZE,
  depth: number = 0,
  maxDepth: number = 5
): T {
  // Prevent infinite recursion
  if (depth >= maxDepth) {
    return data;
  }

  const anonymized: any = Array.isArray(data) ? [] : {};

  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;

    const value = data[key];

    // Check if this field should be anonymized
    if (shouldAnonymize(key, fieldsToAnonymize)) {
      anonymized[key] = anonymizeValue(value, key);
      continue;
    }

    // Recursively anonymize nested objects/arrays
    if (value !== null && typeof value === 'object') {
      anonymized[key] = anonymizeNested(value, fieldsToAnonymize, depth + 1, maxDepth);
    } else {
      anonymized[key] = value;
    }
  }

  return anonymized;
}

/**
 * Create anonymization report
 */
export interface AnonymizationReport {
  totalRecords: number;
  anonymizedFields: string[];
  timestamp: string;
}

export function createAnonymizationReport(
  recordCount: number,
  fieldsAnonymized: string[]
): AnonymizationReport {
  return {
    totalRecords: recordCount,
    anonymizedFields: fieldsAnonymized,
    timestamp: new Date().toISOString(),
  };
}
