import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { eventDetails } = req.body;

    if (!eventDetails || !eventDetails.id) {
      return res.status(400).json({ 
        message: 'Dados do evento são obrigatórios',
        required: 'eventDetails.id (código do evento SAS)'
      });
    }

    const codEventoSAS = String(eventDetails.id);

    // 1. Verificar se o evento já existe no banco local pelo CODEVENTO_SAS
    const { data: existingEvent, error: searchError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('codevento_sas', codEventoSAS)
      .single();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao buscar evento existente:', searchError);
      return res.status(500).json({ 
        message: 'Erro ao verificar evento existente',
        error: searchError.message 
      });
    }

    let localEvent;

    if (existingEvent) {
      // 2. Evento já existe - atualizar dados se necessário
      console.log(`Evento SAS ${codEventoSAS} já existe no banco local com ID ${existingEvent.id}`);
      
      const { data: updatedEvent, error: updateError } = await supabaseAdmin
        .from('events')
        .update({
          nome: eventDetails.nome || existingEvent.nome,
          data_inicio: eventDetails.dataEvento ? new Date(eventDetails.dataEvento).toISOString() : existingEvent.data_inicio,
          data_fim: eventDetails.dataEvento ? new Date(eventDetails.dataEvento).toISOString() : existingEvent.data_fim,
          status: 'active',
          tipo_evento: 'evento_sas',
          modalidade: 'presencial',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEvent.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar evento:', updateError);
        return res.status(500).json({ 
          message: 'Erro ao atualizar evento existente',
          error: updateError.message 
        });
      }

      localEvent = updatedEvent;
      
    } else {
      // 3. Evento não existe - criar novo
      console.log(`Criando novo evento SAS ${codEventoSAS} no banco local`);
      
      const eventData = {
        codevento_sas: codEventoSAS,
        nome: eventDetails.nome || `Evento SAS ${codEventoSAS}`,
        descricao: `Evento importado automaticamente do sistema SAS`,
        data_inicio: eventDetails.dataEvento ? new Date(eventDetails.dataEvento).toISOString() : new Date().toISOString(),
        data_fim: eventDetails.dataEvento ? new Date(eventDetails.dataEvento).toISOString() : new Date().toISOString(),
        local: 'Local do evento SAS',
        capacidade: 1000, // Valor padrão
        modalidade: 'presencial',
        tipo_evento: 'evento_sas',
        publico_alvo: 'Participantes do SAS',
        status: 'active',
        solucao: 'Sistema SAS',
        unidade: 'SEBRAE',
        tipo_acao: 'Evento',
        meta_participantes: 500,
        observacoes: `Evento sincronizado automaticamente do SAS. Código original: ${codEventoSAS}`,
        ativo: true
      };

      const { data: newEvent, error: createError } = await supabaseAdmin
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar evento:', createError);
        return res.status(500).json({ 
          message: 'Erro ao criar novo evento',
          error: createError.message 
        });
      }

      localEvent = newEvent;
      console.log(`Evento SAS ${codEventoSAS} criado com sucesso. ID local: ${newEvent.id}`);
    }

    return res.status(200).json({
      message: existingEvent ? 'Evento atualizado com sucesso' : 'Evento criado com sucesso',
      event: localEvent,
      action: existingEvent ? 'updated' : 'created',
      sasCode: codEventoSAS
    });

  } catch (error) {
    console.error('Erro geral na sincronização do evento SAS:', error);
    return res.status(500).json({
      message: 'Erro interno na sincronização do evento',
      error: error.message
    });
  }
}