/**
 * API: Event Report
 * GET /api/admin/events/[id]/report
 *
 * Returns comprehensive report for a specific event including:
 * - Event details
 * - Statistics (total participants, check-ins, status distribution)
 * - Participant list
 * - Charts data
 */

import { query } from '@/lib/config/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Authentication check
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id: eventId } = req.query;
    const { includeParticipants = 'true', includeStats = 'true' } = req.query;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    // Fetch event details
    const eventResult = await query({
      text: `SELECT * FROM events WHERE id = $1`,
      values: [eventId],
    });

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Initialize report structure
    const report = {
      event: {
        id: event.id,
        nome: event.nome,
        data_inicio: event.data_inicio,
        data_fim: event.data_fim,
        local: event.local,
        cidade: event.cidade,
        status: event.status,
        codevento_sas: event.codevento_sas,
      },
      stats: {},
      participants: [],
      charts: {
        statusDistribution: [],
        dailyCheckIns: [],
        categoryBreakdown: [],
      },
    };

    // Fetch statistics if requested
    if (includeStats === 'true') {
      const statsResult = await query({
        text: `
          SELECT 
            COUNT(DISTINCT r.id) as total_participants,
            COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END) as credenciados,
            COUNT(DISTINCT CASE WHEN r.status = 'checked_in' THEN r.id END) as checked_in,
            COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pendentes,
            COUNT(DISTINCT CASE WHEN r.status = 'cancelled' THEN r.id END) as cancelados,
            COUNT(DISTINCT ci.id) as total_checkins
          FROM registrations r
          LEFT JOIN check_ins ci ON ci.registration_id = r.id
          WHERE r.event_id = $1
        `,
        values: [eventId],
      });

      const stats = statsResult.rows[0];
      report.stats = {
        total_participantes: parseInt(stats.total_participants) || 0,
        credenciados: parseInt(stats.credenciados) || 0,
        checked_in: parseInt(stats.checked_in) || 0,
        pendentes: parseInt(stats.pendentes) || 0,
        cancelados: parseInt(stats.cancelados) || 0,
        total_checkins: parseInt(stats.total_checkins) || 0,
        taxa_credenciamento:
          stats.total_participants > 0
            ? (
                ((parseInt(stats.credenciados) + parseInt(stats.checked_in)) /
                  parseInt(stats.total_participants)) *
                100
              ).toFixed(1)
            : 0,
        taxa_presenca:
          stats.total_participants > 0
            ? ((parseInt(stats.checked_in) / parseInt(stats.total_participants)) * 100).toFixed(1)
            : 0,
      };

      // Status distribution for pie chart
      const statusDistResult = await query({
        text: `
          SELECT 
            r.status,
            COUNT(*) as count
          FROM registrations r
          WHERE r.event_id = $1
          GROUP BY r.status
          ORDER BY count DESC
        `,
        values: [eventId],
      });

      report.charts.statusDistribution = statusDistResult.rows.map((row) => ({
        name: translateStatus(row.status),
        value: parseInt(row.count),
      }));

      // Daily check-ins for line chart
      const dailyCheckInsResult = await query({
        text: `
          SELECT 
            ci.data_check_in_date as date,
            COUNT(*) as count,
            COUNT(DISTINCT p.id) as unique_participants
          FROM check_ins ci
          JOIN registrations r ON r.id = ci.registration_id
          JOIN participants p ON p.id = r.participant_id
          WHERE r.event_id = $1
          GROUP BY ci.data_check_in_date
          ORDER BY date ASC
        `,
        values: [eventId],
      });

      report.charts.dailyCheckIns = dailyCheckInsResult.rows.map((row) => ({
        date: new Date(row.date).toLocaleDateString('pt-BR'),
        count: parseInt(row.count),
        uniqueParticipants: parseInt(row.unique_participants),
      }));

      // Verificar se evento tem múltiplos dias baseado na data_inicio e data_fim
      const dataInicio = event.data_inicio ? new Date(event.data_inicio) : null;
      const dataFim = event.data_fim ? new Date(event.data_fim) : null;

      let isMultiDay = false;
      let eventDays = 1;

      if (dataInicio && dataFim) {
        // Calcular diferença em dias entre data_inicio e data_fim
        const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia inicial
        eventDays = diffDays;
        isMultiDay = diffDays > 1;
      } else if (dataInicio) {
        // Se só tem data_inicio, considerar 1 dia
        eventDays = 1;
        isMultiDay = false;
      }

      report.stats.event_days = eventDays;
      report.stats.is_multi_day_event = isMultiDay;

      // Category breakdown (fonte)
      const categoryResult = await query({
        text: `
          SELECT 
            COALESCE(p.fonte, 'Não especificado') as category,
            COUNT(*) as count
          FROM registrations r
          JOIN participants p ON p.id = r.participant_id
          WHERE r.event_id = $1
          GROUP BY p.fonte
          ORDER BY count DESC
        `,
        values: [eventId],
      });

      report.charts.categoryBreakdown = categoryResult.rows.map((row) => ({
        category: row.category,
        count: parseInt(row.count),
      }));
    }

    // Fetch participants if requested
    if (includeParticipants === 'true') {
      const participantsResult = await query({
        text: `
          SELECT 
            p.id,
            p.nome,
            p.cpf,
            p.email,
            p.fonte,
            r.status as status_credenciamento,
            ci.data_check_in as checked_in_at
          FROM registrations r
          JOIN participants p ON p.id = r.participant_id
          LEFT JOIN check_ins ci ON ci.registration_id = r.id
          WHERE r.event_id = $1
          ORDER BY r.created_at DESC
        `,
        values: [eventId],
      });

      report.participants = participantsResult.rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        cpf: row.cpf,
        email: row.email,
        fonte: row.fonte || 'N/A',
        status_credenciamento: row.status_credenciamento,
        checked_in_at: row.checked_in_at,
        in_sas: row.fonte === 'sas',
        ui_status: row.checked_in_at ? 'checked_in' : row.status_credenciamento,
      }));
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating event report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate event report',
      error: error.message,
    });
  }
}

/**
 * Translate status values to Portuguese
 */
function translateStatus(status) {
  const translations = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    checked_in: 'Credenciado',
    cancelled: 'Cancelado',
    waiting_list: 'Lista de Espera',
  };
  return translations[status] || status;
}
