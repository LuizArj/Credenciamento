const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load .env.local into an object (simple parser, ignores comments)
function loadEnv(filePath) {
  const full = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(full)) return {};
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

const fileEnv = loadEnv('.env.local');
const env = Object.assign({}, process.env, fileEnv);

const pool = new Pool({
  user: env.POSTGRES_USER || 'postgres',
  password: env.POSTGRES_PASSWORD || undefined,
  host: env.POSTGRES_HOST || 'localhost',
  port: env.POSTGRES_PORT ? parseInt(env.POSTGRES_PORT, 10) : 5432,
  database: env.POSTGRES_DATABASE || 'credenciamento',
  ssl: env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

(async function test() {
  try {
    const { rows } = await pool.query('SELECT version()');
    console.log('Conectado ao PostgreSQL:', rows[0].version);
  } catch (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
