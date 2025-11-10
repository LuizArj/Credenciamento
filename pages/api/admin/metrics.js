import { withApiAuth } from '../../../utils/api-auth';
import { query } from '../../../lib/config/database';

// Handler da rota de métricas
async function metricsHandler(req, res) {
  console.log(`[API] /api/admin/metrics ${req.method} - query=${JSON.stringify(req.query)} body=${req.method==='GET'? '{}': JSON.stringify(req.body ? req.body : {})}`);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

    try {
    // Total de eventos
    const totalEventsRes = await query('SELECT COUNT(*)::int AS count FROM events WHERE ativo = true');
    const totalEvents = totalEventsRes.rows[0]?.count || 0;

    // Total de participantes
    const totalParticipantsRes = await query('SELECT COUNT(*)::int AS count FROM participants WHERE ativo = true');
    const totalParticipants = totalParticipantsRes.rows[0]?.count || 0;

    // Eventos ativos
    const activeEventsRes = await query("SELECT COUNT(*)::int AS count FROM events WHERE status = $1 AND ativo = true", ['active']);
    const activeEvents = activeEventsRes.rows[0]?.count || 0;

    // Check-ins de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const participantsTodayRes = await query('SELECT COUNT(*)::int AS count FROM check_ins WHERE data_check_in >= $1', [today.toISOString()]);
    const participantsToday = participantsTodayRes.rows[0]?.count || 0;

    // Credenciamentos recentes (últimos 10)
    const recentRes = await query(`
      SELECT ci.id, ci.data_check_in, p.nome AS participant_name, e.nome AS event_name
      FROM check_ins ci
      JOIN registrations r ON ci.registration_id = r.id
      JOIN participants p ON r.participant_id = p.id
      JOIN events e ON r.event_id = e.id
      ORDER BY ci.data_check_in DESC
      LIMIT 10
    `);
    const recentCredentials = (recentRes.rows || []).map((ci) => ({
      id: ci.id,
      name: ci.participant_name,
      event: ci.event_name,
      time: ci.data_check_in,
    }));

    // Eventos com mais participantes (top 5)
    const eventsWithParticipantsRes = await query(`
      SELECT e.nome, COALESCE((SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id),0)::int AS registrations_count
      FROM events e
      WHERE e.ativo = true
      ORDER BY registrations_count DESC
      LIMIT 5
    `);
    const eventsBreakdown = (eventsWithParticipantsRes.rows || []).map((ev) => ({ name: ev.nome, participants: ev.registrations_count || 0 }));

    // Check-ins por hora (hoje)
    const todayCheckInsRes = await query('SELECT data_check_in FROM check_ins WHERE data_check_in >= $1', [today.toISOString()]);
    const todayCheckIns = todayCheckInsRes.rows || [];

    // Agrupar por hora
    const hourlyCredentials = {};
    todayCheckIns.forEach((checkIn) => {
      const hour = new Date(checkIn.data_check_in).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyCredentials[hourKey] = (hourlyCredentials[hourKey] || 0) + 1;
    });

    const credentialingByHour = Object.entries(hourlyCredentials).map(([hour, count]) => ({ hour, count }));

    const metrics = {
      totalEvents: totalEvents || 0,
      totalParticipants: totalParticipants || 0,
      participantsToday: participantsToday || 0,
      activeEvents: activeEvents || 0,
      recentCredentials,
      eventsBreakdown,
      credentialingByHour,
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Exporta o handler protegido
const handler = withApiAuth(metricsHandler, ['manage_users']);
export default handler;
