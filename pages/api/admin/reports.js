// pages/api/admin/reports.js
import { withApiAuth } from '../../../utils/api-auth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, format, startDate, endDate } = req.query;

    // TODO: Implementar a busca real dos dados no banco
    // Por enquanto, retornando dados fictícios
    const reportData = {
      eventReport: {
        data: [
          {
            eventId: 1,
            eventName: 'Workshop IoT',
            totalParticipants: 150,
            date: '2025-10-01',
            location: 'Auditório Principal',
            averageCheckInTime: '09:15',
            status: 'active'
          },
          {
            eventId: 2,
            eventName: 'Palestra Marketing',
            totalParticipants: 80,
            date: '2025-10-15',
            location: 'Sala de Conferência',
            averageCheckInTime: '14:30',
            status: 'active'
          }
        ],
        summary: {
          totalEvents: 2,
          totalParticipants: 230,
          averageParticipantsPerEvent: 115
        }
      },
      participantReport: {
        data: [
          {
            participantId: 1,
            name: "João Silva",
            cpf: "123.456.789-00",
            email: "joao@email.com",
            events: ["Workshop IoT", "Palestra Marketing"],
            totalEvents: 2,
            lastCheckIn: "2025-09-24T10:30:00"
          },
          {
            participantId: 2,
            name: "Maria Santos",
            cpf: "987.654.321-00",
            email: "maria@email.com",
            events: ["Workshop IoT"],
            totalEvents: 1,
            lastCheckIn: "2025-09-24T09:45:00"
          }
        ],
        summary: {
          totalParticipants: 2,
          averageEventsPerParticipant: 1.5,
          mostPopularEvent: "Workshop IoT"
        }
      }
    };

    const report = reportData[type] || { error: 'Tipo de relatório inválido' };

    if (format === 'csv') {
      // Converter para CSV
      let csv = '';
      
      if (type === 'eventReport') {
        // Cabeçalho
        csv = 'ID,Nome do Evento,Total de Participantes,Data,Local,Horário Médio,Status\n';
        
        // Dados
        report.data.forEach(event => {
          csv += `${event.eventId},${event.eventName},${event.totalParticipants},${event.date},${event.location},${event.averageCheckInTime},${event.status}\n`;
        });
      } else if (type === 'participantReport') {
        // Cabeçalho
        csv = 'ID,Nome,CPF,Email,Eventos,Total de Eventos,Último Check-in\n';
        
        // Dados
        report.data.forEach(participant => {
          csv += `${participant.participantId},${participant.name},${participant.cpf},${participant.email},"${participant.events.join('; ')}",${participant.totalEvents},${participant.lastCheckIn}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-${new Date().toISOString().split('T')[0]}.csv`);
      return res.status(200).send(csv);
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
}

export default withApiAuth(handler, ['view_reports']);