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

    // === MÉTRICAS BÁSICAS DO SUPABASE ===
    
    // Total de eventos
    let { data: eventsData, error: eventsError } = await supabaseAdmin
      .from('events')
      .select(`
        id, 
        nome,
        status, 
        data_inicio, 
        data_fim,
        capacidade,
        created_at,
        registrations(
          id,
          status,
          participant_id,
          check_ins(id)
        )
      `)
      .eq('ativo', true)
      .gte('created_at', startDate.toISOString());

    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
      eventsData = [];
    }

    const totalEvents = eventsData?.length || 0;
    const activeEvents = eventsData?.filter(e => e.status === 'active').length || 0;
    const upcomingEvents = eventsData?.filter(e => new Date(e.data_inicio) > now).length || 0;
    const completedEvents = eventsData?.filter(e => e.status === 'completed').length || 0;

    // Total de participantes únicos
    let { count: totalParticipants, error: participantsError } = await supabaseAdmin
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (participantsError) {
      console.error('Erro ao contar participantes:', participantsError);
      totalParticipants = 0;
    }

    // Calcular registrações e check-ins
    let totalRegistrations = 0;
    let confirmedRegistrations = 0;
    let checkedInRegistrations = 0;
    let cancelledRegistrations = 0;

    eventsData?.forEach(event => {
      event.registrations?.forEach(reg => {
        totalRegistrations++;
        if (reg.status === 'confirmed') confirmedRegistrations++;
        if (reg.status === 'cancelled') cancelledRegistrations++;
        if (reg.check_ins?.length > 0) checkedInRegistrations++;
      });
    });

    const attendanceRate = totalRegistrations > 0 
      ? Math.round((checkedInRegistrations / totalRegistrations) * 100) 
      : 0;

    // Buscar check-ins recentes
    const { data: recentCheckInsData } = await supabaseAdmin
      .from('check_ins')
      .select(`
        id,
        data_check_in,
        responsavel_credenciamento,
        registrations!inner(
          participants!inner(nome),
          events!inner(nome)
        )
      `)
      .order('data_check_in', { ascending: false })
      .limit(5);

    const recentCheckIns = recentCheckInsData?.map(checkIn => ({
      id: checkIn.id,
      participantName: checkIn.registrations.participants.nome,
      eventName: checkIn.registrations.events.nome,
      time: checkIn.data_check_in,
      responsavel: checkIn.responsavel_credenciamento
    })) || [];

    // Estatísticas dos eventos
    const eventStats = eventsData?.slice(0, 5).map(event => {
      const registrationsCount = event.registrations?.length || 0;
      const checkedInCount = event.registrations?.filter(r => r.check_ins?.length > 0).length || 0;
      const capacity = event.capacidade || 0;
      const occupancyRate = capacity > 0 ? Math.round((registrationsCount / capacity) * 100) : 0;
      const attendanceRate = registrationsCount > 0 ? Math.round((checkedInCount / registrationsCount) * 100) : 0;

      return {
        id: event.id,
        name: event.nome || 'Evento sem nome',
        totalRegistrations: registrationsCount,
        checkedIn: checkedInCount,
        capacity,
        occupancyRate: `${occupancyRate}%`,
        attendanceRate: `${attendanceRate}%`
      };
    }) || [];

    // Dados do gráfico - check-ins dos últimos 7 dias
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const { count } = await supabaseAdmin
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .gte('data_check_in', date.toISOString())
        .lt('data_check_in', nextDate.toISOString());

      const labels = ['6 dias atrás', '5 dias atrás', '4 dias atrás', '3 dias atrás', '2 dias atrás', 'Ontem', 'Hoje'];
      
      chartData.push({
        date: date.toISOString().split('T')[0],
        count: count || 0,
        label: labels[6 - i]
      });
    }

    // Top empresas por participantes
    const { data: topCompaniesData } = await supabaseAdmin
      .from('companies')
      .select(`
        razao_social,
        nome_fantasia,
        participants(count)
      `)
      .eq('ativo', true)
      .limit(5);

    const topCompanies = topCompaniesData?.map(company => ({
      name: company.nome_fantasia || company.razao_social,
      participants: company.participants?.length || 0
    })).sort((a, b) => b.participants - a.participants) || [];

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