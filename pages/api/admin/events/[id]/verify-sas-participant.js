/**
 * API: Verify and Resend Participant to SAS
 * POST /api/admin/events/[id]/verify-sas-participant
 *
 * Verifica se um participante está registrado no SAS e reenvia se necessário
 */

import { query } from '@/lib/config/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Authentication check
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id: eventId } = req.query;
    const { cpf, forceResend = false } = req.body;

    console.log('[VERIFY_SAS] Request:', { eventId, cpf, forceResend });

    if (!eventId || !cpf) {
      return res.status(400).json({
        success: false,
        message: 'Event ID and CPF are required',
      });
    }

    // 1. Buscar evento com código SAS
    const eventResult = await query({
      text: `SELECT id, codevento_sas, nome FROM events WHERE id = $1`,
      values: [eventId],
    });

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = eventResult.rows[0];

    if (!event.codevento_sas) {
      return res.status(400).json({
        success: false,
        message: 'Event does not have a SAS code configured',
      });
    }

    // 2. Buscar participante local
    const cleanCpf = cpf.replace(/\D/g, '');
    const participantResult = await query({
      text: `
        SELECT p.*, r.id as registration_id, r.status as registration_status
        FROM participants p
        INNER JOIN registrations r ON r.participant_id = p.id
        WHERE p.cpf = $1 AND r.event_id = $2
      `,
      values: [cleanCpf, eventId],
    });

    if (participantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found in this event',
      });
    }

    const participant = participantResult.rows[0];

    // 3. Verificar se existe no SAS
    console.log('[VERIFY_SAS] Checking participant in SAS...');
    const existsInSAS = await checkParticipantInSAS(cleanCpf, event.codevento_sas);

    console.log('[VERIFY_SAS] Participant exists in SAS:', existsInSAS);

    // 4. Se não existe ou forceResend = true, enviar para o SAS
    if (!existsInSAS || forceResend) {
      console.log('[VERIFY_SAS] Sending participant to SAS...');

      const sendResult = await sendParticipantToSAS(participant, event.codevento_sas);

      if (!sendResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send participant to SAS',
          error: sendResult.error,
          existsInSAS,
        });
      }

      return res.status(200).json({
        success: true,
        message: forceResend
          ? 'Participant data resent to SAS successfully'
          : 'Participant sent to SAS successfully',
        data: {
          existsInSAS,
          wasSent: true,
          participant: {
            cpf: participant.cpf,
            nome: participant.nome,
            email: participant.email,
          },
          sasResponse: sendResult.data,
        },
      });
    }

    // 5. Se já existe no SAS
    return res.status(200).json({
      success: true,
      message: 'Participant already exists in SAS',
      data: {
        existsInSAS: true,
        wasSent: false,
        participant: {
          cpf: participant.cpf,
          nome: participant.nome,
          email: participant.email,
        },
      },
    });
  } catch (error) {
    console.error('[VERIFY_SAS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Verifica se o participante existe no evento SAS
 */
async function checkParticipantInSAS(cpf, codEventoSas) {
  try {
    const url = `${process.env.NEXT_PUBLIC_SEBRAE_API_URL}/SelecionarInscricao`;
    const params = new URLSearchParams({
      CgcCpf: cpf,
      CodEvento: codEventoSas,
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-req': process.env.SEBRAE_API_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[VERIFY_SAS] Participant not found in SAS (404)');
        return false;
      }
      throw new Error(`SAS API error: ${response.status}`);
    }

    const data = await response.json();

    // Se retornou array vazio ou null, não existe
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log('[VERIFY_SAS] Participant not found in SAS (empty response)');
      return false;
    }

    console.log('[VERIFY_SAS] Participant found in SAS');
    return true;
  } catch (error) {
    console.error('[VERIFY_SAS] Error checking participant in SAS:', error);
    // Em caso de erro, assumimos que não existe para permitir reenvio
    return false;
  }
}

/**
 * Envia o participante para o SAS
 */
async function sendParticipantToSAS(participant, codEventoSas) {
  try {
    const url = `${process.env.NEXT_PUBLIC_SEBRAE_API_URL}/IncluirInscricao`;

    // Preparar payload seguindo estrutura do SAS
    const payload = {
      CodEvento: codEventoSas,
      CgcCpf: participant.cpf.replace(/\D/g, ''),
      NomePessoa: participant.nome,
      Email: participant.email || '',
      Telefone: participant.telefone || '',
      // Campos opcionais
      Cargo: participant.cargo || '',
      Empresa: participant.company_id || '',
      // Status da inscrição
      Situacao: 1, // 1 = Ativo
      // Data de inscrição
      DataInscricao: new Date().toISOString(),
    };

    console.log('[VERIFY_SAS] Sending payload to SAS:', payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-req': process.env.SEBRAE_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[VERIFY_SAS] Error parsing SAS response:', e);
      throw new Error(`Invalid SAS response: ${responseText}`);
    }

    if (!response.ok) {
      console.error('[VERIFY_SAS] SAS API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: data,
      });

      return {
        success: false,
        error: `SAS API error: ${response.status} - ${JSON.stringify(data)}`,
      };
    }

    console.log('[VERIFY_SAS] Participant sent to SAS successfully:', data);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[VERIFY_SAS] Error sending participant to SAS:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
