import { normalizeCPF } from '@/lib/utils/cpf';
import { getCurrentDateTimeGMT4 } from '@/lib/utils/timezone';
import { query, withTransaction } from '../../lib/config/database';

/**
 * Retry logic para deadlocks (40P01) e serialization failures (40001)
 */
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable =
        error.code === '40P01' || error.code === '40001' || error.code === '23505';

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      console.warn(
        `[RETRY] Attempt ${attempt}/${maxRetries} failed with ${error.code}, retrying...`
      );
      // Exponential backoff: 100ms, 200ms, 400ms
      await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastError;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { participant, eventDetails, attendantName, localEventId } = req.body;

    if (!participant || !eventDetails) {
      return res.status(400).json({
        message: 'Dados do participante e evento são obrigatórios',
      });
    }

    const cpfClean = normalizeCPF(participant.cpf);
    const requestId = `${cpfClean}-${eventDetails.id}-${Date.now()}`;

    console.log(`[CHECKIN:${requestId}] Iniciando credenciamento`, {
      participantCpf: cpfClean,
      eventSasId: eventDetails.id,
      localEventId,
      attendant: attendantName,
    });

    // Executar todo o fluxo dentro de uma transação com retry
    const result = await withRetry(async () => {
      return await withTransaction(async (client) => {
        console.log(`[CHECKIN:${requestId}] Transação iniciada`);

        // 1. Buscar evento com lock (previne race condition)
        let localEvent = null;
        if (localEventId) {
          const { rows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [
            localEventId,
          ]);
          localEvent = rows[0];
        }

        if (!localEvent) {
          const { rows } = await client.query(
            'SELECT * FROM events WHERE codevento_sas = $1 FOR UPDATE',
            [String(eventDetails.id)]
          );
          localEvent = rows[0];
        }

        if (!localEvent) {
          console.error(`[CHECKIN:${requestId}] Evento não encontrado`);
          throw new Error('Evento não foi sincronizado no banco local');
        }

        console.log(`[CHECKIN:${requestId}] Evento encontrado: ${localEvent.nome}`);

        // 2. UPSERT de participante (INSERT ... ON CONFLICT)
        // Garante que apenas um INSERT seja bem-sucedido mesmo com concorrência
        const { rows: participantRows } = await client.query(
          `INSERT INTO participants (cpf, nome, email, telefone, fonte, observacoes, ativo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (cpf) 
           DO UPDATE SET 
             nome = EXCLUDED.nome,
             email = EXCLUDED.email,
             telefone = EXCLUDED.telefone,
             fonte = EXCLUDED.fonte,
             updated_at = EXCLUDED.updated_at
           RETURNING *`,
          [
            cpfClean,
            participant.name,
            participant.email,
            participant.phone,
            participant.source || 'sas',
            `Credenciamento SAS - Evento ${eventDetails.id}`,
            true,
            getCurrentDateTimeGMT4(),
            getCurrentDateTimeGMT4(),
          ]
        );
        const localParticipant = participantRows[0];

        console.log(`[CHECKIN:${requestId}] Participante processado: ${localParticipant.nome}`);

        // 3. UPSERT de registration (INSERT ... ON CONFLICT)
        const codigoInscricao = `SAS-${eventDetails.id}-${cpfClean}`;
        const { rows: registrationRows } = await client.query(
          `INSERT INTO registrations (
            event_id, participant_id, data_inscricao, status, 
            forma_pagamento, valor_pago, codigo_inscricao, observacoes,
            created_at, updated_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (event_id, participant_id)
           DO UPDATE SET
             status = CASE 
               WHEN registrations.status = 'cancelled' THEN EXCLUDED.status
               ELSE registrations.status
             END,
             updated_at = EXCLUDED.updated_at
           RETURNING *`,
          [
            localEvent.id,
            localParticipant.id,
            getCurrentDateTimeGMT4(),
            'confirmed',
            'sas',
            0.0,
            codigoInscricao,
            'Inscrição via credenciamento SAS',
            getCurrentDateTimeGMT4(),
            getCurrentDateTimeGMT4(),
          ]
        );
        const localRegistration = registrationRows[0];

        console.log(`[CHECKIN:${requestId}] Registration processada: ${localRegistration.id}`);

        // 4. UPSERT de check-in para HOJE
        // Usa índice UNIQUE em (registration_id, data_check_in_date)
        // Coluna data_check_in_date é GENERATED, calculada automaticamente
        const currentDateTime = getCurrentDateTimeGMT4();

        // Primeiro, verificar se já existe check-in HOJE
        const { rows: existingCheckIn } = await client.query(
          `SELECT id, data_check_in, responsavel_credenciamento 
           FROM check_ins 
           WHERE registration_id = $1 
             AND data_check_in_date = $2::date
           LIMIT 1`,
          [localRegistration.id, currentDateTime]
        );

        let checkIn;
        let isNewCheckIn;

        if (existingCheckIn.length > 0) {
          // Já existe check-in hoje - atualizar
          const { rows: updatedCheckIn } = await client.query(
            `UPDATE check_ins 
             SET data_check_in = $1,
                 responsavel_credenciamento = $2,
                 observacoes = $3
             WHERE id = $4
             RETURNING *`,
            [
              currentDateTime,
              attendantName || 'Sistema SAS',
              'Check-in via sistema SAS (atualizado)',
              existingCheckIn[0].id,
            ]
          );
          checkIn = updatedCheckIn[0];
          isNewCheckIn = false;
        } else {
          // Não existe check-in hoje - criar novo
          const { rows: newCheckIn } = await client.query(
            `INSERT INTO check_ins (
              registration_id, data_check_in, responsavel_credenciamento, observacoes, created_at
            )
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              localRegistration.id,
              currentDateTime,
              attendantName || 'Sistema SAS',
              'Check-in via sistema SAS',
              currentDateTime,
            ]
          );
          checkIn = newCheckIn[0];
          isNewCheckIn = true;
        }

        console.log(
          `[CHECKIN:${requestId}] Check-in ${isNewCheckIn ? 'CRIADO' : 'JÁ EXISTIA HOJE'}`
        );

        return {
          participant: localParticipant,
          event: localEvent,
          registration: localRegistration,
          checkIn,
          isNewCheckIn,
        };
      });
    });

    // Resposta diferenciada se já existia check-in HOJE
    if (result.isNewCheckIn) {
      console.log(`[CHECKIN:${requestId}] ✅ Credenciamento registrado com sucesso`);
      return res.status(200).json({
        message: 'Credenciamento registrado com sucesso',
        data: result,
        isNewCheckIn: true,
      });
    } else {
      console.log(`[CHECKIN:${requestId}] ⚠️ Participante já tinha check-in HOJE`);
      return res.status(200).json({
        message: 'Participante já fez check-in hoje',
        data: result,
        warning: 'duplicate_checkin_today',
        isNewCheckIn: false,
        previousCheckIn: {
          date: result.checkIn.data_check_in,
          attendant: result.checkIn.responsavel_credenciamento,
        },
      });
    }
  } catch (error) {
    console.error('[CHECKIN] Erro geral no registro do credenciamento:', error);

    // Mensagens de erro mais específicas
    let errorMessage = 'Erro interno no registro do credenciamento';

    if (error.message?.includes('Evento não foi sincronizado')) {
      errorMessage = 'Evento não encontrado. Sincronize o evento antes de credenciar.';
    } else if (error.code === '23505') {
      errorMessage =
        'Conflito de dados detectado. A operação foi processada com sucesso por outro atendente.';
    } else if (error.code === '40P01') {
      errorMessage = 'Sistema ocupado. Tente novamente em alguns segundos.';
    }

    return res.status(500).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code,
    });
  }
}
