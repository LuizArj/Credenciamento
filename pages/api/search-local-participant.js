/**
 * API: Search Local Participant
 * POST /api/search-local-participant
 *
 * Busca participante no banco de dados local antes de ir para SAS/CPE
 * Retorna dados do participante se encontrado e se está inscrito no evento
 */

import { query } from '@/lib/config/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { cpf, eventId } = req.body;

    if (!cpf) {
      return res.status(400).json({
        success: false,
        message: 'CPF is required',
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const cleanCpf = cpf.replace(/\D/g, '');

    console.log('[SEARCH_LOCAL] Buscando participante local:', { cpf: cleanCpf, eventId });

    // Check if eventId is UUID or codevento_sas
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);

    // Search for participant in local database with event enrollment
    const result = await query({
      text: `
        SELECT 
          p.id,
          p.nome,
          p.cpf,
          p.email,
          p.telefone,
          p.data_nascimento,
          p.genero,
          p.created_at,
          r.id as registration_id,
          r.event_id,
          e.nome as event_name,
          e.codevento_sas,
          ci.id as checkin_id,
          ci.data_check_in,
          ci.responsavel_credenciamento
        FROM participants p
        INNER JOIN registrations r ON r.participant_id = p.id
        INNER JOIN events e ON e.id = r.event_id
        LEFT JOIN check_ins ci ON ci.registration_id = r.id
        WHERE p.cpf = $1 
          AND (${isUUID ? 'e.id = $2::uuid' : 'e.codevento_sas = $2'})
        ORDER BY r.created_at DESC
        LIMIT 1
      `,
      values: [cleanCpf, eventId],
    });

    if (result.rows.length === 0) {
      console.log('[SEARCH_LOCAL] Participante não encontrado no banco local');
      return res.status(404).json({
        success: false,
        message: 'Participant not found in local database',
        found: false,
      });
    }

    const participant = result.rows[0];

    console.log('[SEARCH_LOCAL] Participante encontrado:', {
      nome: participant.nome,
      isEnrolled: true,
      hasCheckIn: !!participant.checkin_id,
    });

    // Format response
    const response = {
      success: true,
      found: true,
      isEnrolled: true,
      hasCheckIn: !!participant.checkin_id,
      participant: {
        name: participant.nome,
        cpf: cleanCpf,
        email: participant.email || '',
        phone: participant.telefone || '',
        birthDate: participant.data_nascimento,
        gender: participant.genero,
        source: 'local', // Indicate data came from local database
      },
      checkInData: participant.checkin_id
        ? {
            id: participant.checkin_id,
            data_check_in: participant.data_check_in,
            responsavel_credenciamento: participant.responsavel_credenciamento,
          }
        : null,
      eventInfo: {
        id: participant.event_id,
        nome: participant.event_name,
        codevento_sas: participant.codevento_sas,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('[SEARCH_LOCAL] Erro:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search local participant',
      error: error.message,
    });
  }
}
