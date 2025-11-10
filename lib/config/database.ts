import { Pool } from 'pg';
import { env } from './env';

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  user: env.POSTGRES_USER || 'postgres',
  password: env.POSTGRES_PASSWORD,
  host: env.POSTGRES_HOST || 'localhost',
  port: parseInt(env.POSTGRES_PORT || '5432', 10),
  database: env.POSTGRES_DATABASE || 'credenciamento',
  ssl: env.POSTGRES_SSL === 'true' ? {
    rejectUnauthorized: false // em produção, configure certificados apropriados
  } : undefined,
  // Configurações do pool
  max: 20, // máximo de conexões
  idleTimeoutMillis: 30000, // tempo máximo que uma conexão pode ficar ociosa
  connectionTimeoutMillis: 2000, // tempo máximo para estabelecer conexão
});

// Testar conexão ao iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message);
    return;
  }
  client!.query('SELECT version()', (err, result) => {
    release?.();
    if (err) {
      console.error('Erro ao executar query:', err.message);
      return;
    }
    console.log('Conectado ao PostgreSQL:', result.rows[0].version);
  });
});

// Listeners para debug/monitoramento do pool
pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err.message);
});

pool.on('connect', () => {
  console.debug('Nova conexão estabelecida com PostgreSQL');
});

// Exportar pool singleton
export const db = pool;

// Helper para queries parametrizadas
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Only show detailed SQL logs in development when DEBUG_SQL=true
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true') {
      try {
        const shortQuery = typeof text === 'string' ? text.substring(0, 200) : (text as any).text?.substring(0, 200);
        console.log('[SQL]', { query: shortQuery, duration: `${duration}ms`, rows: res.rowCount });
      } catch (_) {
        // ignore logging errors
      }
    }
    return res;
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  }
}

// Helper para transações
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Helper to set session-local variables on a client (useful for RLS checks that read current_setting)
export async function setSessionVariables(client: any, vars: Record<string, string | null | number>) {
  // Execute SET LOCAL for each provided var inside the current transaction/connection
  // Use the set_config(name, value, is_local) function which accepts parameters
  for (const [k, v] of Object.entries(vars || {})) {
    await client.query('SELECT set_config($1, $2, true)', [k, v == null ? null : String(v)]);
  }
}