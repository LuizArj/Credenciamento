import { normalizeCPF } from '@/lib/utils/cpf';
import { getCurrentDateTimeGMT4 } from '@/lib/utils/timezone';
import { query, withTransaction } from '../../lib/config/database';

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

    console.log('Registrando credenciamento no banco local:', {
      participantCpf: participant.cpf,
      eventSasId: eventDetails.id,
      localEventId,
    });

    // 1. Buscar o evento local pelo CODEVENTO_SAS
    let localEvent = null;
    if (localEventId) {
      const { rows } = await query('SELECT * FROM events WHERE id = $1 LIMIT 1', [localEventId]);
      localEvent = rows[0];
    }

    if (!localEvent) {
      const { rows } = await query('SELECT * FROM events WHERE codevento_sas = $1 LIMIT 1', [String(eventDetails.id)]);
      localEvent = rows[0];
    }

    if (!localEvent) {
      console.error('Evento local não encontrado para SAS ID:', eventDetails.id);
      return res.status(404).json({ message: 'Evento não foi sincronizado no banco local', sasEventId: eventDetails.id });
    }

    const cpfClean = normalizeCPF(participant.cpf);

    // 2. Verificar/criar participante (em transação onde necessário)
    let localParticipant = null;
    const existingRows = await query('SELECT * FROM participants WHERE cpf = $1 LIMIT 1', [cpfClean]);
    const existingParticipant = existingRows.rows[0];

    if (existingParticipant) {
      const { rows: updatedRows } = await query(
        'UPDATE participants SET nome = $1, email = $2, telefone = $3, fonte = $4, updated_at = $5 WHERE id = $6 RETURNING *',
        [participant.name, participant.email, participant.phone, participant.source || 'sas', getCurrentDateTimeGMT4(), existingParticipant.id]
      );
      localParticipant = updatedRows[0];
    } else {
      const { rows: newRows } = await query(
        `INSERT INTO participants (cpf, nome, email, telefone, fonte, observacoes, ativo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [cpfClean, participant.name, participant.email, participant.phone, participant.source || 'sas', `Criado automaticamente via credenciamento SAS - Evento ${eventDetails.id}`, true]
      );
      localParticipant = newRows[0];
    }

    // 3. Verificar se já existe registro/inscrição
    // 3. Verificar se já existe registro/inscrição
    const regRows = await query('SELECT * FROM registrations WHERE event_id = $1 AND participant_id = $2 LIMIT 1', [localEvent.id, localParticipant.id]);
    let localRegistration = regRows.rows[0];
    if (localRegistration) {
      if (localRegistration.status !== 'confirmed') {
        const { rows: updatedRegRows } = await query('UPDATE registrations SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *', ['confirmed', getCurrentDateTimeGMT4(), localRegistration.id]);
        if (updatedRegRows[0]) localRegistration = updatedRegRows[0];
      }
    } else {
      const registrationData = {
        event_id: localEvent.id,
        participant_id: localParticipant.id,
        data_inscricao: getCurrentDateTimeGMT4(),
        status: 'confirmed',
        forma_pagamento: 'sas',
        valor_pago: 0.0,
        codigo_inscricao: `SAS-${eventDetails.id}-${cpfClean}`,
        observacoes: `Inscrição criada automaticamente via credenciamento SAS`,
      };
      const { rows: newRegRows } = await query(
        `INSERT INTO registrations (event_id, participant_id, data_inscricao, status, forma_pagamento, valor_pago, codigo_inscricao, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [registrationData.event_id, registrationData.participant_id, registrationData.data_inscricao, registrationData.status, registrationData.forma_pagamento, registrationData.valor_pago, registrationData.codigo_inscricao, registrationData.observacoes]
      );
      localRegistration = newRegRows[0];
    }

    // 4. Verificar se já foi feito check-in
    const checkRows = await query('SELECT * FROM check_ins WHERE registration_id = $1 LIMIT 1', [localRegistration.id]);
    const existingCheckIn = checkRows.rows[0];
    if (!existingCheckIn) {
      const checkInData = {
        registration_id: localRegistration.id,
        data_check_in: getCurrentDateTimeGMT4(),
        responsavel_credenciamento: attendantName || 'Sistema SAS',
        observacoes: `Check-in realizado automaticamente via sistema SAS`,
      };
      const { rows: newCheckRows } = await query(`INSERT INTO check_ins (registration_id, data_check_in, responsavel_credenciamento, observacoes) VALUES ($1,$2,$3,$4) RETURNING *`, [checkInData.registration_id, checkInData.data_check_in, checkInData.responsavel_credenciamento, checkInData.observacoes]);
      const newCheckIn = newCheckRows[0];
      console.log('Credenciamento registrado com sucesso no banco local');
      return res.status(200).json({ message: 'Credenciamento registrado com sucesso', data: { participant: localParticipant, event: localEvent, registration: localRegistration, checkIn: newCheckIn } });
    } else {
      console.log('Check-in já existia para este participante');
      return res.status(200).json({ message: 'Participante já tinha check-in registrado', data: { participant: localParticipant, event: localEvent, registration: localRegistration, checkIn: existingCheckIn } });
    }
  } catch (error) {
    console.error('Erro geral no registro do credenciamento:', error);
    return res.status(500).json({
      message: 'Erro interno no registro do credenciamento',
      error: error.message,
    });
  }
}
