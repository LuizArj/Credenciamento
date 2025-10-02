import { withApiAuth } from '../../../utils/api-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

    // === MÉTRICAS BÁSICAS ===
    
    // Total de eventos
    let { data: eventsData, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, status, data_inicio, capacidade')
      .gte('created_at', startDate.toISOString());

    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
      // Se erro, retornar dados zerados
      eventsData = [];
    }

    const totalEvents = eventsData?.length || 0;
    const activeEvents = eventsData?.filter(e => e.status === 'active').length || 0;
    const upcomingEvents = eventsData?.filter(e => new Date(e.data_inicio) > now).length || 0;
    const completedEvents = eventsData?.filter(e => e.status === 'completed').length || 0;

    // Total de participantes
    let { count: totalParticipants, error: participantsError } = await supabaseAdmin
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (participantsError) {
      console.error('Erro ao contar participantes:', participantsError);
      totalParticipants = 0;
    }

    // Por enquanto, dados básicos sem relacionamentos complexos
    const dashboardData = {
      summary: {
        totalEvents,
        activeEvents,
        upcomingEvents,
        completedEvents,
        totalParticipants: totalParticipants || 0,
        totalRegistrations: 0, // Por enquanto zerado
        confirmedRegistrations: 0,
        checkedInRegistrations: 0,
        cancelledRegistrations: 0,
        attendanceRate: 0
      },
      recentCheckIns: [], // Por enquanto vazio
      eventStats: eventsData?.slice(0, 5).map(event => ({
        id: event.id,
        name: event.nome || 'Evento sem nome',
        totalRegistrations: 0,
        checkedIn: 0,
        capacity: event.capacidade || 0,
        occupancyRate: '0',
        attendanceRate: '0'
      })) || [],
      chartData: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 0, label: '6 dias atrás' },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 0, label: '5 dias atrás' },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 0, label: '4 dias atrás' },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 0, label: '3 dias atrás' },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 0, label: '2 dias atrás' },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 0, label: 'Ontem' },
        { date: new Date().toISOString().split('T')[0], count: 0, label: 'Hoje' }
      ],
      topCompanies: [], // Por enquanto vazio
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