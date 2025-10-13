/**
 * Configurações centralizadas da aplicação
 * 
 * @module lib/config
 * @description Ponto de entrada único para todas as configurações da aplicação
 */

// Variáveis de ambiente validadas
export {
  env,
  isProd,
  isDev,
  isTest,
  appConfig,
  supabaseConfig,
  authConfig,
  apiConfig,
  securityConfig,
  loggingConfig,
  type Env,
} from './env';

// Clientes Supabase
export {
  supabaseClient,
  supabaseApi,
  getSupabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
  supabase, // deprecated
} from './supabase';
