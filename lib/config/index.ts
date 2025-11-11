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
  authConfig,
  apiConfig,
  securityConfig,
  loggingConfig,
  type Env,
} from './env';
// Database helpers (Postgres)
export { db, query, withTransaction } from './database';
