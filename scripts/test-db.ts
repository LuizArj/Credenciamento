import { db } from '../lib/config/database.js';

async function testConnection() {
  try {
    const { rows } = await db.query('SELECT version()');
    console.log('Conectado ao PostgreSQL:', rows[0].version);
    await db.end(); // fecha o pool
  } catch (err) {
    console.error('Erro ao conectar:', err);
  }
}

testConnection();