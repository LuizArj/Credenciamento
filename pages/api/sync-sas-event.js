import { query } from '@/lib/config/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
  const { eventDetails } = req.body;

    if (!eventDetails || !eventDetails.id) {
      return res.status(400).json({
        message: 'Dados do evento são obrigatórios',
        required: 'eventDetails.id (código do evento SAS)',
      });
    }

    const codEventoSAS = String(eventDetails.id);

  // Minimal logging: indicate sync start
  console.log(`Sincronizando evento SAS: ${eventDetails?.id}`);
  // 1. Verificar se o evento já existe no banco local pelo CODEVENTO_SAS
    const { rows: existingRows } = await query('SELECT * FROM events WHERE codevento_sas = $1 LIMIT 1', [codEventoSAS]);
    const existingEvent = existingRows[0] || null;

    let localEvent;

    if (existingEvent) {
  // 2. Evento já existe - atualizar dados se necessário

      const { rows: updatedRows } = await query(
        `UPDATE events SET nome=$1, data_inicio=$2, data_fim=$3, status=$4, tipo_evento=$5, modalidade=$6, updated_at=$7 WHERE id=$8 RETURNING *`,
        [
          eventDetails.nome || existingEvent.nome,
          eventDetails.dataEvento ? new Date(eventDetails.dataEvento).toISOString() : existingEvent.data_inicio,
          eventDetails.dataEvento ? new Date(eventDetails.dataEvento).toISOString() : existingEvent.data_fim,
          'active',
          'evento_sas',
          'presencial',
          new Date().toISOString(),
          existingEvent.id,
        ]
      );

      localEvent = updatedRows[0];
    } else {
      // 3. Evento não existe - criar novo
      // creating new local event

      const eventData = {
        codevento_sas: codEventoSAS,
        nome: eventDetails.nome || `Evento SAS ${codEventoSAS}`,
        descricao: `Evento importado automaticamente do sistema SAS`,
        data_inicio: eventDetails.dataEvento
          ? new Date(eventDetails.dataEvento).toISOString()
          : new Date().toISOString(),
        data_fim: eventDetails.dataEvento
          ? new Date(eventDetails.dataEvento).toISOString()
          : new Date().toISOString(),
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
        ativo: true,
      };

      const { rows: newRows } = await query(
        `INSERT INTO events (codevento_sas,nome,descricao,data_inicio,data_fim,local,capacidade,modalidade,tipo_evento,publico_alvo,status,solucao,unidade,tipo_acao,meta_participantes,observacoes,ativo,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
        [
          eventData.codevento_sas,
          eventData.nome,
          eventData.descricao,
          eventData.data_inicio,
          eventData.data_fim,
          eventData.local,
          eventData.capacidade,
          eventData.modalidade,
          eventData.tipo_evento,
          eventData.publico_alvo,
          eventData.status,
          eventData.solucao,
          eventData.unidade,
          eventData.tipo_acao,
          eventData.meta_participantes,
          eventData.observacoes,
          eventData.ativo,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      localEvent = newRows[0];
      console.log(`Evento sincronizado com ID: ${localEvent.id}`);
    }

    return res.status(200).json({
      message: existingEvent ? 'Evento atualizado com sucesso' : 'Evento criado com sucesso',
      event: localEvent,
      action: existingEvent ? 'updated' : 'created',
      sasCode: codEventoSAS,
    });
  } catch (error) {
    console.error('Erro geral na sincronização do evento SAS:', error);
    return res.status(500).json({
      message: 'Erro interno na sincronização do evento',
      error: error.message,
    });
  }
}
