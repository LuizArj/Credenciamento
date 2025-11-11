/**
 * API: Check Existing Check-in
 * POST /api/check-existing-checkin
 *
 * Verifica se um participante já foi credenciado em um evento
 * Retorna informações do check-in existente se encontrado
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

    console.log('[CHECK_EXISTING] Verificando:', { cpf: cleanCpf, eventId });

    // Buscar check-in existente
    const result = await query({
      text: `
        SELECT 
          ci.id as checkin_id,
          ci.data_check_in,
          ci.responsavel_credenciamento,
          ci.observacoes,
          p.nome as participant_name,
          p.cpf,
          p.email,
          e.nome as event_name
        FROM check_ins ci
        INNER JOIN registrations r ON r.id = ci.registration_id
        INNER JOIN participants p ON p.id = r.participant_id
        INNER JOIN events e ON e.id = r.event_id
        WHERE p.cpf = $1 
          AND (e.id = $2::uuid OR e.codevento_sas = $2)
        ORDER BY ci.data_check_in DESC
        LIMIT 1
      `,
      values: [cleanCpf, eventId],
    });

    if (result.rows.length === 0) {
      console.log('[CHECK_EXISTING] Não encontrado check-in existente');
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: false,
      });
    }

    const checkInData = result.rows[0];

    console.log('[CHECK_EXISTING] Check-in encontrado:', {
      participant: checkInData.participant_name,
      date: checkInData.data_check_in,
      by: checkInData.responsavel_credenciamento,
    });

    return res.status(200).json({
      success: true,
      alreadyCheckedIn: true,
      participantName: checkInData.participant_name,
      checkInData: {
        id: checkInData.checkin_id,
        data_check_in: checkInData.data_check_in,
        responsavel_credenciamento: checkInData.responsavel_credenciamento,
        observacoes: checkInData.observacoes,
      },
      participantInfo: {
        cpf: checkInData.cpf,
        nome: checkInData.participant_name,
        email: checkInData.email,
      },
      eventInfo: {
        nome: checkInData.event_name,
      },
    });
  } catch (error) {
    console.error('[CHECK_EXISTING] Erro:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check existing check-in',
      error: error.message,
    });
  }
}
