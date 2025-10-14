/**
 * Configuração centralizada de variáveis de ambiente com validação Zod
 *
 * @module lib/config/env
 * @description Valida e exporta todas as variáveis de ambiente necessárias
 * para a aplicação, garantindo type safety e falha rápida em caso de
 * configuração incorreta.
 */

import { z } from 'zod';

/**
 * Schema de validação para variáveis de ambiente
 */
const envSchema = z
  .object({
    // Aplicação
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url({
      message: 'NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida',
    }),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória',
    }),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_KEY: z.string().min(1).optional(),

    // Keycloak
    KEYCLOAK_CLIENT_ID: z.string().optional(),
    KEYCLOAK_CLIENT_SECRET: z.string().optional(),
    KEYCLOAK_ISSUER: z.string().url().optional(),
    KEYCLOAK_REALM: z.string().optional(),

    // NextAuth
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(32).optional(),

    // CPE (SEBRAE)
    CPE_CLIENT_ID: z.string().optional(),
    CPE_CLIENT_SECRET: z.string().optional(),
    CPE_API_URL: z.string().url().optional(),

    // SAS (SEBRAE)
    SEBRAE_API_KEY: z.string().optional(),
    SEBRAE_COD_UF: z.string().default('24'),
    SAS_API_URL: z.string().url().optional(),
    SAS_API_KEY: z.string().optional(),

    // 4Events
    FOUR_EVENTS_CLIENT_TOKEN: z.string().optional(),
    FOUR_EVENTS_API_URL: z.string().url().optional(),

    // Webhooks
    N8N_WEBHOOK_URL: z.string().url().optional(),
    N8N_WEBHOOK_CHECKIN_URL: z.string().url().optional(),
    NEXT_PUBLIC_WEBHOOK_URL: z.string().url().optional(),

    // Segurança
    NEXT_PUBLIC_ACCESS_KEY: z.string().optional(),
    NEXT_PUBLIC_FALLBACK_URL: z.string().url().optional(),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_LOGGING: z
      .string()
      .optional()
      .default('true')
      .transform((val) => val === 'true'),

    // Rate Limiting
    RATE_LIMIT_MAX_REQUESTS: z
      .string()
      .optional()
      .default('100')
      .transform((val) => Number(val)),
    RATE_LIMIT_WINDOW_MS: z
      .string()
      .optional()
      .default('900000')
      .transform((val) => Number(val)),
  })
  .refine((data) => data.SUPABASE_SERVICE_ROLE_KEY || data.SUPABASE_SERVICE_KEY, {
    message:
      'É necessário definir SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SERVICE_KEY no arquivo .env.local',
    path: ['SUPABASE_SERVICE_ROLE_KEY'],
  });

/**
 * Tipo inferido do schema para type safety
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Valida as variáveis de ambiente ao carregar o módulo
 */
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => {
        return `  - ${issue.path.join('.')}: ${issue.message}`;
      });

      throw new Error(
        `❌ Erro de configuração - Variáveis de ambiente inválidas:\n${missingVars.join('\n')}\n\n` +
          'Verifique o arquivo .env.example e configure corretamente seu .env.local'
      );
    }
    throw error;
  }
}

/**
 * Configuração validada e exportada
 */
export const env = validateEnv();

/**
 * Helper para verificar se está em produção
 */
export const isProd = env.NODE_ENV === 'production';

/**
 * Helper para verificar se está em desenvolvimento
 */
export const isDev = env.NODE_ENV === 'development';

/**
 * Helper para verificar se está em teste
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Configurações da aplicação
 */
export const appConfig = {
  url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  env: env.NODE_ENV,
  isProd,
  isDev,
  isTest,
} as const;

/**
 * Configurações do Supabase
 */
export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY,
} as const;

/**
 * Configurações de autenticação
 */
export const authConfig = {
  keycloak: {
    clientId: env.KEYCLOAK_CLIENT_ID,
    clientSecret: env.KEYCLOAK_CLIENT_SECRET,
    issuer: env.KEYCLOAK_ISSUER,
    realm: env.KEYCLOAK_REALM,
  },
  nextAuth: {
    url: env.NEXTAUTH_URL,
    secret: env.NEXTAUTH_SECRET,
  },
} as const;

/**
 * Configurações de APIs externas
 */
export const apiConfig = {
  cpe: {
    clientId: env.CPE_CLIENT_ID,
    clientSecret: env.CPE_CLIENT_SECRET,
    baseUrl: env.CPE_API_URL,
  },
  sas: {
    apiKey: env.SEBRAE_API_KEY || env.SAS_API_KEY,
    codUf: env.SEBRAE_COD_UF,
    baseUrl: env.SAS_API_URL,
  },
  fourEvents: {
    token: env.FOUR_EVENTS_CLIENT_TOKEN,
    baseUrl: env.FOUR_EVENTS_API_URL,
  },
  webhooks: {
    n8n: env.N8N_WEBHOOK_URL,
    n8nCheckin: env.N8N_WEBHOOK_CHECKIN_URL,
    public: env.NEXT_PUBLIC_WEBHOOK_URL,
  },
} as const;

/**
 * Configurações de segurança
 */
export const securityConfig = {
  accessKey: env.NEXT_PUBLIC_ACCESS_KEY,
  fallbackUrl: env.NEXT_PUBLIC_FALLBACK_URL || appConfig.url,
  rateLimit: {
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },
} as const;

/**
 * Configurações de logging
 */
export const loggingConfig = {
  level: env.LOG_LEVEL,
  enabled: env.ENABLE_LOGGING,
} as const;
