import { withApiAuth } from '../../../../utils/api-auth';
import { query } from '../../../../lib/config/database';

async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Return the most recent events (by data_inicio)
    const limit = 6;
    const eventsRes = await query(`SELECT * FROM events ORDER BY data_inicio DESC LIMIT $1`, [limit]);
    const events = eventsRes.rows || [];

    return res.status(200).json(events);
  } catch (err) {
    console.error('Erro ao buscar eventos recentes:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar eventos recentes' });
  }
}

export default withApiAuth(handler, { GET: ['events.view'] });
