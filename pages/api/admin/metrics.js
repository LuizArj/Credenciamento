import { withApiAuth } from '../../../utils/api-auth';
import { getSupabaseAdmin } from '../../../lib/config/supabase';

// Handler da rota de métricas
async function metricsHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Buscar dados reais do Supabase

    // Total de eventos
    const { count: totalEvents } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    // Total de participantes
    const { count: totalParticipants } = await supabaseAdmin
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    // Eventos ativos
    const { count: activeEvents } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('ativo', true);

    // Check-ins de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: participantsToday } = await supabaseAdmin
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .gte('data_check_in', today.toISOString());

    // Credenciamentos recentes (últimos 10)
    const { data: recentCheckIns } = await supabaseAdmin
      .from('check_ins')
      .select(
        `
        id,
        data_check_in,
        registrations!inner(
          participants!inner(nome),
          events!inner(nome)
        )
      `
      )
      .order('data_check_in', { ascending: false })
      .limit(10);

    const recentCredentials =
      recentCheckIns?.map((checkIn) => ({
        id: checkIn.id,
        name: checkIn.registrations.participants.nome,
        event: checkIn.registrations.events.nome,
        time: checkIn.data_check_in,
      })) || [];

    // Eventos com mais participantes
    const { data: eventsWithParticipants } = await supabaseAdmin
      .from('events')
      .select(
        `
        nome,
        registrations(count)
      `
      )
      .eq('ativo', true)
      .limit(5);

    const eventsBreakdown =
      eventsWithParticipants?.map((event) => ({
        name: event.nome,
        participants: event.registrations?.length || 0,
      })) || [];

    // Check-ins por hora (hoje)
    const { data: todayCheckIns } = await supabaseAdmin
      .from('check_ins')
      .select('data_check_in')
      .gte('data_check_in', today.toISOString());

    // Agrupar por hora
    const hourlyCredentials = {};
    todayCheckIns?.forEach((checkIn) => {
      const hour = new Date(checkIn.data_check_in).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyCredentials[hourKey] = (hourlyCredentials[hourKey] || 0) + 1;
    });

    const credentialingByHour = Object.entries(hourlyCredentials).map(([hour, count]) => ({
      hour,
      count,
    }));

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
