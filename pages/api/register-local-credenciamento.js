import { createClient } from '@supabase/supabase-js';
import { normalizeCPF } from '@/lib/utils/cpf';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    let localEvent;
    if (localEventId) {
      const { data: eventById } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', localEventId)
        .single();
      localEvent = eventById;
    }

    if (!localEvent) {
      const { data: eventByCode } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('codevento_sas', String(eventDetails.id))
        .single();
      localEvent = eventByCode;
    }

    if (!localEvent) {
      console.error('Evento local não encontrado para SAS ID:', eventDetails.id);
      return res.status(404).json({
        message: 'Evento não foi sincronizado no banco local',
        sasEventId: eventDetails.id,
      });
    }

    const cpfClean = normalizeCPF(participant.cpf);

    // 2. Verificar/criar participante
    let localParticipant;
    const { data: existingParticipant } = await supabaseAdmin
      .from('participants')
      .select('*')
      .eq('cpf', cpfClean)
      .single();

    if (existingParticipant) {
      // Atualizar dados do participante
      const { data: updatedParticipant, error: updateError } = await supabaseAdmin
        .from('participants')
        .update({
          nome: participant.name,
          email: participant.email,
          telefone: participant.phone,
          fonte: participant.source || 'sas',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingParticipant.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar participante:', updateError);
        return res.status(500).json({
          message: 'Erro ao atualizar participante',
          error: updateError.message,
        });
      }

      localParticipant = updatedParticipant;
    } else {
      // Criar novo participante
      const participantData = {
        cpf: cpfClean,
        nome: participant.name,
        email: participant.email,
        telefone: participant.phone,
        fonte: participant.source || 'sas',
        observacoes: `Criado automaticamente via credenciamento SAS - Evento ${eventDetails.id}`,
        ativo: true,
      };

      const { data: newParticipant, error: createError } = await supabaseAdmin
        .from('participants')
        .insert(participantData)
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar participante:', createError);
        return res.status(500).json({
          message: 'Erro ao criar participante',
          error: createError.message,
        });
      }

      localParticipant = newParticipant;
    }

    // 3. Verificar se já existe registro/inscrição
    const { data: existingRegistration } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('event_id', localEvent.id)
      .eq('participant_id', localParticipant.id)
      .single();

    let localRegistration;
    if (existingRegistration) {
      localRegistration = existingRegistration;
      // Garantir que a inscrição esteja pelo menos confirmada
      if (localRegistration.status !== 'confirmed') {
        const { data: updatedReg } = await supabaseAdmin
          .from('registrations')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', localRegistration.id)
          .select()
          .single();
        if (updatedReg) localRegistration = updatedReg;
      }
    } else {
      // Criar nova inscrição
      const registrationData = {
        event_id: localEvent.id,
        participant_id: localParticipant.id,
        data_inscricao: new Date().toISOString(),
        // Ao credenciar pelo sistema, confirmar a inscrição; presença será registrada em check_ins
        status: 'confirmed',
        forma_pagamento: 'sas',
        valor_pago: 0.0,
        codigo_inscricao: `SAS-${eventDetails.id}-${cpfClean}`,
        observacoes: `Inscrição criada automaticamente via credenciamento SAS`,
      };

      const { data: newRegistration, error: regError } = await supabaseAdmin
        .from('registrations')
        .insert(registrationData)
        .select()
        .single();

      if (regError) {
        console.error('Erro ao criar registro:', regError);
        return res.status(500).json({
          message: 'Erro ao criar registro de inscrição',
          error: regError.message,
        });
      }

      localRegistration = newRegistration;
    }

    // 4. Verificar se já foi feito check-in
    const { data: existingCheckIn } = await supabaseAdmin
      .from('check_ins')
      .select('*')
      .eq('registration_id', localRegistration.id)
      .single();

    if (!existingCheckIn) {
      // Criar check-in
      const checkInData = {
        registration_id: localRegistration.id,
        data_check_in: new Date().toISOString(),
        responsavel_credenciamento: attendantName || 'Sistema SAS',
        observacoes: `Check-in realizado automaticamente via sistema SAS`,
      };

      const { data: newCheckIn, error: checkInError } = await supabaseAdmin
        .from('check_ins')
        .insert(checkInData)
        .select()
        .single();

      if (checkInError) {
        console.error('Erro ao criar check-in:', checkInError);
        return res.status(500).json({
          message: 'Erro ao criar check-in',
          error: checkInError.message,
        });
      }

      console.log('Credenciamento registrado com sucesso no banco local');

      return res.status(200).json({
        message: 'Credenciamento registrado com sucesso',
        data: {
          participant: localParticipant,
          event: localEvent,
          registration: localRegistration,
          checkIn: newCheckIn,
        },
      });
    } else {
      console.log('Check-in já existia para este participante');

      return res.status(200).json({
        message: 'Participante já tinha check-in registrado',
        data: {
          participant: localParticipant,
          event: localEvent,
          registration: localRegistration,
          checkIn: existingCheckIn,
        },
      });
    }
  } catch (error) {
    console.error('Erro geral no registro do credenciamento:', error);
    return res.status(500).json({
      message: 'Erro interno no registro do credenciamento',
      error: error.message,
    });
  }
}
