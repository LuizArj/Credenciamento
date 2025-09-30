import { withApiAuth } from '../../../utils/api-auth';

// Handler da rota de métricas
async function metricsHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Implementar lógica para buscar dados reais do banco
    // Por enquanto, retornando dados fictícios para desenvolvimento
    const metrics = {
      totalEvents: 25,
      totalParticipants: 1250,
      participantsToday: 45,
      activeEvents: 3,
      recentCredentials: [
        { id: 1, name: "João Silva", event: "Workshop IoT", time: "2025-09-24T10:30:00" },
        { id: 2, name: "Maria Santos", event: "Palestra Marketing", time: "2025-09-24T10:15:00" },
        { id: 3, name: "Pedro Costa", event: "Curso Excel", time: "2025-09-24T10:00:00" }
      ],
      eventsBreakdown: [
        { name: "Workshop IoT", participants: 150 },
        { name: "Palestra Marketing", participants: 200 },
        { name: "Curso Excel", participants: 100 }
      ],
      credentialingByHour: [
        { hour: "08:00", count: 25 },
        { hour: "09:00", count: 45 },
        { hour: "10:00", count: 30 },
        { hour: "11:00", count: 20 }
      ]
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