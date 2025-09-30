import { withApiAuth } from '../../../../utils/api-auth';

// Handler da rota de eventos recentes
async function recentEventsHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Implementar lógica para buscar dados reais do banco
    // Por enquanto, retornando dados fictícios para desenvolvimento
    const recentEvents = [
      {
        id: 1,
        name: "Workshop IoT",
        date: "2025-09-25",
        status: "Em andamento",
        participants: 150,
        capacity: 200
      },
      {
        id: 2,
        name: "Palestra Marketing",
        date: "2025-09-26",
        status: "Agendado",
        participants: 180,
        capacity: 200
      },
      {
        id: 3,
        name: "Curso Excel",
        date: "2025-09-24",
        status: "Concluído",
        participants: 95,
        capacity: 100
      }
    ];

    return res.status(200).json(recentEvents);
  } catch (error) {
    console.error('Erro ao buscar eventos recentes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Exporta o handler protegido
const handler = withApiAuth(recentEventsHandler, ['manage_events']);
export default handler;