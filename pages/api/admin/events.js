import { withApiAuth } from '../../../utils/api-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// ===== GET - Buscar eventos =====
async function handleGet(req, res) {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    // Primeiro, buscar apenas os eventos
    let query = supabaseAdmin.from('events').select('*').order('data_inicio', { ascending: false });

    // Filtros
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`nome.ilike.%${search}%, local.ilike.%${search}%`);
    }

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      return res.status(500).json({ error: 'Erro ao buscar eventos' });
    }

    // Se não há eventos, retornar array vazio
    if (!events || events.length === 0) {
      return res.status(200).json({
        events: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
        },
      });
    }

    // Buscar estatísticas de registrations para cada evento
    const eventIds = events.map((e) => e.id);
    const { data: registrationStats } = await supabaseAdmin
      .from('registrations')
      .select('event_id, status')
      .in('event_id', eventIds);

    // Agrupar estatísticas por evento
    const statsByEvent = {};
    registrationStats?.forEach((reg) => {
      if (!statsByEvent[reg.event_id]) {
        statsByEvent[reg.event_id] = {
          total: 0,
          checkedIn: 0,
          cancelled: 0,
        };
      }
      statsByEvent[reg.event_id].total++;
      if (reg.status === 'checked_in') statsByEvent[reg.event_id].checkedIn++;
      if (reg.status === 'cancelled') statsByEvent[reg.event_id].cancelled++;
    });

    // Processar dados e adicionar estatísticas reais
    const eventsWithStats = events.map((event) => {
      const stats = statsByEvent[event.id] || { total: 0, checkedIn: 0, cancelled: 0 };
      const attendanceRate =
        stats.total > 0 ? ((stats.checkedIn / stats.total) * 100).toFixed(1) : '0';

      return {
        ...event,
        totalRegistrations: stats.total,
        checkedInCount: stats.checkedIn,
        cancelledCount: stats.cancelled,
        attendanceRate,
        ticketCategories: [],
      };
    });

    return res.status(200).json({
      events: eventsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('Erro inesperado ao buscar eventos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// ===== POST - Criar evento =====
async function handlePost(req, res) {
  try {
    const {
      nome,
      descricao,
      dataInicio,
      dataFim,
      local,
      endereco,
      capacidade,
      modalidade,
      tipoEvento,
      publicoAlvo,
      gerente,
      coordenador,
      solucao,
      unidade,
      tipoAcao,
      status = 'active',
      metaParticipantes,
      configuracoes = {},
      ticketCategories = [],
      codevento_sas,
    } = req.body;

    // Validações
    if (!nome || !dataInicio || !local) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, dataInicio, local',
      });
    }

    // Verificar se a data de início não é no passado
    if (new Date(dataInicio) < new Date()) {
      return res.status(400).json({
        error: 'A data de início não pode ser no passado',
      });
    }

    // Verificar se dataFim é posterior a dataInicio
    if (dataFim && new Date(dataFim) <= new Date(dataInicio)) {
      return res.status(400).json({
        error: 'A data de fim deve ser posterior à data de início',
      });
    }

    // Criar o evento
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .insert([
        {
          nome,
          descricao,
          data_inicio: dataInicio,
          data_fim: dataFim,
          local,
          endereco,
          capacidade: parseInt(capacidade) || 0,
          modalidade,
          tipo_evento: tipoEvento,
          publico_alvo: publicoAlvo,
          gerente,
          coordenador,
          solucao,
          unidade,
          tipo_acao: tipoAcao,
          status,
          meta_participantes: parseInt(metaParticipantes) || 0,
          configuracoes,
          codevento_sas,
        },
      ])
      .select()
      .single();

    if (eventError) {
      console.error('Erro ao criar evento:', eventError);
      return res.status(500).json({ error: 'Erro ao criar evento' });
    }

    // Criar categorias de tickets se fornecidas
    if (ticketCategories.length > 0) {
      const categories = ticketCategories.map((cat) => ({
        event_id: event.id,
        nome: cat.nome,
        descricao: cat.descricao,
        preco: parseFloat(cat.preco) || 0,
        quantidade_disponivel: parseInt(cat.quantidadeDisponivel) || 0,
        data_inicio_venda: cat.dataInicioVenda,
        data_fim_venda: cat.dataFimVenda,
      }));

      const { error: categoriesError } = await supabaseAdmin
        .from('ticket_categories')
        .insert(categories);

      if (categoriesError) {
        console.error('Erro ao criar categorias de tickets:', categoriesError);
        // Não retorna erro fatal, evento já foi criado
      }
    }

    return res.status(201).json(event);
  } catch (error) {
    console.error('Erro inesperado ao criar evento:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// ===== PUT - Atualizar evento =====
async function handlePut(req, res) {
  try {
    const { id, ticketCategories, ...eventData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID do evento é obrigatório' });
    }

    // Verificar se o evento existe
    const { data: existingEvent, error: checkError } = await supabaseAdmin
      .from('events')
      .select('id, status')
      .eq('id', id)
      .single();

    if (checkError || !existingEvent) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (eventData.nome) updateData.nome = eventData.nome;
    if (eventData.descricao !== undefined) updateData.descricao = eventData.descricao;
    if (eventData.dataInicio) updateData.data_inicio = eventData.dataInicio;
    if (eventData.dataFim !== undefined) updateData.data_fim = eventData.dataFim;
    if (eventData.local) updateData.local = eventData.local;
    if (eventData.endereco !== undefined) updateData.endereco = eventData.endereco;
    if (eventData.capacidade !== undefined)
      updateData.capacidade = parseInt(eventData.capacidade) || 0;
    if (eventData.modalidade) updateData.modalidade = eventData.modalidade;
    if (eventData.tipoEvento) updateData.tipo_evento = eventData.tipoEvento;
    if (eventData.publicoAlvo !== undefined) updateData.publico_alvo = eventData.publicoAlvo;
    if (eventData.gerente !== undefined) updateData.gerente = eventData.gerente;
    if (eventData.coordenador !== undefined) updateData.coordenador = eventData.coordenador;
    if (eventData.solucao !== undefined) updateData.solucao = eventData.solucao;
    if (eventData.unidade !== undefined) updateData.unidade = eventData.unidade;
    if (eventData.tipoAcao !== undefined) updateData.tipo_acao = eventData.tipoAcao;
    if (eventData.status) updateData.status = eventData.status;
    if (eventData.metaParticipantes !== undefined)
      updateData.meta_participantes = parseInt(eventData.metaParticipantes) || 0;
    if (eventData.configuracoes !== undefined) updateData.configuracoes = eventData.configuracoes;
    if (eventData.codevento_sas !== undefined) updateData.codevento_sas = eventData.codevento_sas;

    // Atualizar evento
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar evento:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar evento' });
    }

    // Atualizar categorias de tickets se fornecidas
    if (ticketCategories && Array.isArray(ticketCategories)) {
      // Remover categorias existentes
      await supabaseAdmin.from('ticket_categories').delete().eq('event_id', id);

      // Inserir novas categorias
      if (ticketCategories.length > 0) {
        const categories = ticketCategories.map((cat) => ({
          event_id: id,
          nome: cat.nome,
          descricao: cat.descricao,
          preco: parseFloat(cat.preco) || 0,
          quantidade_disponivel: parseInt(cat.quantidadeDisponivel) || 0,
          data_inicio_venda: cat.dataInicioVenda,
          data_fim_venda: cat.dataFimVenda,
        }));

        const { error: categoriesError } = await supabaseAdmin
          .from('ticket_categories')
          .insert(categories);

        if (categoriesError) {
          console.error('Erro ao atualizar categorias de tickets:', categoriesError);
        }
      }
    }

    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Erro inesperado ao atualizar evento:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// ===== DELETE - Remover evento =====
async function handleDelete(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID do evento é obrigatório' });
    }

    // Verificar se há registrações para este evento
    const { data: registrations, error: checkError } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('event_id', id)
      .limit(1);

    if (checkError) {
      console.error('Erro ao verificar registrações:', checkError);
      return res.status(500).json({ error: 'Erro ao verificar registrações do evento' });
    }

    if (registrations && registrations.length > 0) {
      return res.status(400).json({
        error:
          'Não é possível excluir evento com participantes registrados. Cancele o evento em vez de excluí-lo.',
      });
    }

    // Excluir o evento (categorias de tickets serão excluídas automaticamente pelo CASCADE)
    const { error: deleteError } = await supabaseAdmin.from('events').delete().eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir evento:', deleteError);
      return res.status(500).json({ error: 'Erro ao excluir evento' });
    }

    return res.status(200).json({ message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Erro inesperado ao excluir evento:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Aplicar middleware de autenticação para todos os métodos
export default withApiAuth(handler, {
  GET: ['events.view'],
  POST: ['events.manage'],
  PUT: ['events.manage'],
  DELETE: ['events.manage'],
});
