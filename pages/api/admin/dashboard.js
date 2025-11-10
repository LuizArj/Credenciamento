import { withApiAuth } from '../../../utils/api-auth';
import { query } from '../../../lib/config/database';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period = 'month' } = req.query;

    // Calcular período para filtros
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Buscar eventos no período
    const eventsRes = await query('SELECT id, nome, status, data_inicio, data_fim, capacidade, created_at FROM events WHERE ativo = true AND created_at >= $1', [startDate.toISOString()]);
    const eventsData = eventsRes.rows || [];

    const totalEvents = eventsData.length;
    const activeEvents = eventsData.filter((e) => e.status === 'active').length;
    const upcomingEvents = eventsData.filter((e) => new Date(e.data_inicio) > now).length;
    const completedEvents = eventsData.filter((e) => e.status === 'completed').length;

    // Total de participantes únicos
    const partRes = await query('SELECT COUNT(*)::int AS total FROM participants WHERE ativo = true');
    const totalParticipants = partRes.rows[0]?.total || 0;

    // Calcular registrações e check-ins por evento
    const eventIds = eventsData.map((e) => e.id);
    let totalRegistrations = 0;
    let confirmedRegistrations = 0;
    let checkedInRegistrations = 0;
    let cancelledRegistrations = 0;
    if (eventIds.length > 0) {
      const regsRes = await query(`SELECT event_id, status, COUNT(*)::int AS count FROM registrations WHERE event_id = ANY($1) GROUP BY event_id, status`, [eventIds]);
      const regs = regsRes.rows || [];
      regs.forEach((r) => {
        totalRegistrations += r.count;
        if (r.status === 'confirmed') confirmedRegistrations += r.count;
        if (r.status === 'cancelled') cancelledRegistrations += r.count;
      });

      const checkRes = await query(`SELECT r.event_id, COUNT(ci.*)::int AS count FROM check_ins ci JOIN registrations r ON ci.registration_id = r.id WHERE r.event_id = ANY($1) GROUP BY r.event_id`, [eventIds]);
      const checks = checkRes.rows || [];
      checkedInRegistrations = checks.reduce((s, c) => s + c.count, 0);
    }

    const attendanceRate = totalRegistrations > 0 
      ? Math.round((checkedInRegistrations / totalRegistrations) * 100) 
      : 0;

    // Buscar check-ins recentes
    const recentRes = await query(`
      SELECT ci.id, ci.data_check_in, ci.responsavel_credenciamento, p.nome AS participant_name, e.nome AS event_name
      FROM check_ins ci
      JOIN registrations r ON ci.registration_id = r.id
      JOIN participants p ON r.participant_id = p.id
      JOIN events e ON r.event_id = e.id
      ORDER BY ci.data_check_in DESC
      LIMIT 5
    `);
    const recentCheckIns = (recentRes.rows || []).map((ci) => ({
      id: ci.id,
      participantName: ci.participant_name,
      eventName: ci.event_name,
      time: ci.data_check_in,
      responsavel: ci.responsavel_credenciamento,
    }));

    // Estatísticas dos eventos
    // Estatísticas resumidas por evento (top 5)
    const eventStats = [];
    if (eventIds.length > 0) {
      const regCountsRes = await query(`SELECT event_id, COUNT(*)::int AS registrations_count FROM registrations WHERE event_id = ANY($1) GROUP BY event_id`, [eventIds]);
      const regCounts = regCountsRes.rows || [];
      const regMap = Object.fromEntries(regCounts.map((r) => [r.event_id, r.registrations_count]));

      const checkedCountsRes = await query(`SELECT r.event_id, COUNT(ci.*)::int AS checked_in FROM check_ins ci JOIN registrations r ON ci.registration_id = r.id WHERE r.event_id = ANY($1) GROUP BY r.event_id`, [eventIds]);
      const checkedMap = Object.fromEntries((checkedCountsRes.rows || []).map((r) => [r.event_id, r.checked_in]));

      for (const event of eventsData.slice(0, 5)) {
        const registrationsCount = regMap[event.id] || 0;
        const checkedInCount = checkedMap[event.id] || 0;
        const capacity = event.capacidade || 0;
        const occupancyRate = capacity > 0 ? Math.round((registrationsCount / capacity) * 100) : 0;
        const attendanceRate = registrationsCount > 0 ? Math.round((checkedInCount / registrationsCount) * 100) : 0;
        eventStats.push({
          id: event.id,
          name: event.nome || 'Evento sem nome',
          totalRegistrations: registrationsCount,
          checkedIn: checkedInCount,
          capacity,
          occupancyRate: `${occupancyRate}%`,
          attendanceRate: `${attendanceRate}%`,
        });
      }
    }

    // Dados do gráfico - check-ins dos últimos 7 dias
    // Chart data: check-ins dos últimos 7 dias
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 6);
    sinceDate.setHours(0, 0, 0, 0);
    const chartRes = await query(`SELECT (date_trunc('day', data_check_in))::date AS day, COUNT(*)::int AS count FROM check_ins WHERE data_check_in >= $1 GROUP BY day ORDER BY day`, [sinceDate.toISOString()]);
    const countsByDay = Object.fromEntries((chartRes.rows || []).map((r) => [r.day.toISOString().split('T')[0], r.count]));
    const labels = ['6 dias atrás', '5 dias atrás', '4 dias atrás', '3 dias atrás', '2 dias atrás', 'Ontem', 'Hoje'];
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      chartData.push({ date: key, count: countsByDay[key] || 0, label: labels[6 - i] });
    }

    // Top empresas por participantes
    const topRes = await query(`
      SELECT c.razao_social, c.nome_fantasia, COUNT(p.id)::int AS participants
      FROM companies c
      LEFT JOIN participants p ON p.company_id = c.id
      WHERE c.ativo = true
      GROUP BY c.id
      ORDER BY participants DESC
      LIMIT 5
    `);
    const topCompanies = (topRes.rows || []).map((company) => ({ name: company.nome_fantasia || company.razao_social, participants: company.participants || 0 }));

    // Por enquanto, dados básicos sem relacionamentos complexos
    const dashboardData = {
      summary: {
        totalEvents,
        activeEvents,
        upcomingEvents,
        completedEvents,
        totalParticipants: totalParticipants || 0,
        totalRegistrations,
        confirmedRegistrations,
        checkedInRegistrations,
        cancelledRegistrations,
        attendanceRate
      },
      recentCheckIns,
      eventStats,
      chartData,
      topCompanies,
      period,
      generatedAt: new Date().toISOString()
    };

    return res.status(200).json(dashboardData);

  } catch (error) {
    console.error('Erro inesperado no dashboard:', error);
    
    // Retornar dados zerados em caso de erro
    return res.status(200).json({
      summary: {
        totalEvents: 0,
        activeEvents: 0,
        upcomingEvents: 0,
        completedEvents: 0,
        totalParticipants: 0,
        totalRegistrations: 0,
        confirmedRegistrations: 0,
        checkedInRegistrations: 0,
        cancelledRegistrations: 0,
        attendanceRate: 0
      },
      recentCheckIns: [],
      eventStats: [],
      chartData: [
        { date: new Date().toISOString().split('T')[0], count: 0, label: 'Hoje' }
      ],
      topCompanies: [],
      period: 'month',
      generatedAt: new Date().toISOString()
    });
  }
}

export default withApiAuth(handler, ['dashboard.view']);