import { withApiAuth } from '../../../../utils/api-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Handler da rota de eventos recentes
async function recentEventsHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar eventos recentes do Supabase
    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        nome,
        data_inicio,
        data_fim,
        status,
        capacidade,
        registrations(count)
      `)
      .eq('ativo', true)
      .order('data_inicio', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      return res.status(500).json({ error: 'Erro ao buscar eventos' });
    }

    const recentEvents = events?.map(event => {
      const now = new Date();
      const startDate = new Date(event.data_inicio);
      const endDate = new Date(event.data_fim);
      
      let status = event.status;
      if (status === 'active') {
        if (startDate > now) {
          status = 'Agendado';
        } else if (endDate < now) {
          status = 'Concluído';
        } else {
          status = 'Em andamento';
        }
      } else if (status === 'completed') {
        status = 'Concluído';
      } else if (status === 'cancelled') {
        status = 'Cancelado';
      } else {
        status = 'Rascunho';
      }

      return {
        id: event.id,
        name: event.nome,
        date: event.data_inicio.split('T')[0], // Apenas a data
        status,
        participants: event.registrations?.length || 0,
        capacity: event.capacidade || 0
      };
    }) || [];

    return res.status(200).json(recentEvents);
  } catch (error) {
    console.error('Erro ao buscar eventos recentes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Exporta o handler protegido
const handler = withApiAuth(recentEventsHandler, ['manage_events']);
export default handler;