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
    const { type, format, startDate, endDate } = req.query;

    // Calcular período padrão se não fornecido
    const endDateTime = endDate ? new Date(endDate) : new Date();
    const startDateTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás

    let reportData = {};

    if (type === 'eventReport' || !type) {
      // === RELATÓRIO DE EVENTOS ===
      let { data: events, error: eventsError } = await supabaseAdmin
        .from('events')
        .select('*')
        .gte('data_inicio', startDateTime.toISOString())
        .lte('data_inicio', endDateTime.toISOString())
        .order('data_inicio', { ascending: false });

      if (eventsError) {
        console.error('Erro ao buscar eventos:', eventsError);
        events = [];
      }

      const eventData = (events || []).map(event => {
        return {
          eventId: event.id,
          eventName: event.nome,
          totalParticipants: 0, // Por enquanto zerado
          checkedInParticipants: 0,
          date: event.data_inicio ? event.data_inicio.split('T')[0] : '',
          location: event.local || '',
          averageCheckInTime: 'N/A',
          status: event.status,
          capacity: event.capacidade || 0,
          occupancyRate: '0',
          attendanceRate: '0'
        };
      });

      const summary = {
        totalEvents: events?.length || 0,
        totalParticipants: 0,
        totalCheckedIn: 0,
        averageParticipantsPerEvent: 0,
        averageAttendanceRate: '0'
      };

      reportData.eventReport = { data: eventData, summary };
    }

    if (type === 'participantReport' || !type) {
      // === RELATÓRIO DE PARTICIPANTES ===
      let { data: participants, error: participantsError } = await supabaseAdmin
        .from('participants')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (participantsError) {
        console.error('Erro ao buscar participantes:', participantsError);
        participants = [];
      }

      const participantData = (participants || []).map(participant => {
        return {
          participantId: participant.id,
          name: participant.nome,
          cpf: participant.cpf,
          email: participant.email,
          company: 'N/A', // Por enquanto sem empresa
          events: [], // Por enquanto vazio
          totalEvents: 0,
          totalCheckIns: 0,
          lastCheckIn: null,
          lastCheckInBy: null,
          registrationRate: '0'
        };
      });

      const summary = {
        totalParticipants: participants?.length || 0,
        averageEventsPerParticipant: '0',
        mostActiveParticipant: 'N/A',
        totalCheckIns: 0
      };

      reportData.participantReport = { data: participantData, summary };
    }

    // === EXPORTAR PARA CSV ===
    if (format === 'csv') {
      let csv = '';
      
      if (type === 'eventReport') {
        csv = 'ID,Nome do Evento,Total de Participantes,Check-ins,Data,Local,Horário Médio,Status,Capacidade,Taxa de Ocupação,Taxa de Comparecimento\n';
        reportData.eventReport.data.forEach(event => {
          csv += `${event.eventId},"${event.eventName}",${event.totalParticipants},${event.checkedInParticipants},${event.date},"${event.location}",${event.averageCheckInTime},${event.status},${event.capacity},${event.occupancyRate}%,${event.attendanceRate}%\n`;
        });
      } else if (type === 'participantReport') {
        csv = 'ID,Nome,CPF,Email,Empresa,Eventos Participados,Total de Eventos,Total Check-ins,Último Check-in,Check-in por,Taxa de Comparecimento\n';
        reportData.participantReport.data.forEach(participant => {
          csv += `${participant.participantId},"${participant.name}",${participant.cpf},"${participant.email}","${participant.company}","${participant.events.join('; ')}",${participant.totalEvents},${participant.totalCheckIns},${participant.lastCheckIn || 'N/A'},"${participant.lastCheckInBy || 'N/A'}",${participant.registrationRate}%\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${type || 'relatorio'}-${new Date().toISOString().split('T')[0]}.csv`);
      return res.status(200).send('\uFEFF' + csv); // BOM para UTF-8
    }

    const report = reportData[type] || reportData;

    return res.status(200).json({
      ...report,
      period: {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    
    // Retornar dados zerados em caso de erro
    const emptyReport = {
      eventReport: {
        data: [],
        summary: {
          totalEvents: 0,
          totalParticipants: 0,
          totalCheckedIn: 0,
          averageParticipantsPerEvent: 0,
          averageAttendanceRate: '0'
        }
      },
      participantReport: {
        data: [],
        summary: {
          totalParticipants: 0,
          averageEventsPerParticipant: '0',
          mostActiveParticipant: 'N/A',
          totalCheckIns: 0
        }
      },
      period: {
        start: new Date().toISOString(),
        end: new Date().toISOString()
      },
      generatedAt: new Date().toISOString()
    };

    return res.status(200).json(emptyReport);
  }
}

export default withApiAuth(handler, ['view_reports']);