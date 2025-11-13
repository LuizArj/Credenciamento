import { withApiAuth } from '../../../utils/api-auth';
import { query, withTransaction } from '../../../lib/config/database';

async function handler(req, res) {
  console.log(
    `[API] /api/admin/events ${req.method} - query=${JSON.stringify(req.query)} body=${req.method === 'GET' ? '{}' : JSON.stringify(req.body ? req.body : {})}`
  );
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
    const {
      status,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sortBy = 'data_inicio',
      sortOrder = 'desc',
    } = req.query;

    // Validar sortBy
    const validSortFields = ['nome', 'data_inicio', 'local', 'modalidade', 'tipo_evento'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'data_inicio';
    const ascending = sortOrder === 'asc';

    // Build WHERE clauses and parameters
    const params = [];
    const where = [];

    if (status && status !== 'all') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(nome ILIKE $${params.length} OR local ILIKE $${params.length} OR codevento_sas ILIKE $${params.length})`
      );
    }

    if (dateFrom) {
      params.push(dateFrom);
      where.push(`data_inicio >= $${params.length}`);
    }

    if (dateTo) {
      params.push(dateTo);
      where.push(`data_inicio <= $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Count total
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM events ${whereSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    // Pagination
    const limitVal = parseInt(limit, 10) || 10;
    const offset = (parseInt(page, 10) - 1) * limitVal;
    params.push(limitVal, offset);

    const eventsRes = await query(
      `SELECT * FROM events ${whereSql} ORDER BY ${sortField} ${sortOrder === 'asc' ? 'ASC' : 'DESC'} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const events = eventsRes.rows || [];

    if (!events.length) {
      return res.status(200).json({ events: [], total, page: parseInt(page), limit: limitVal });
    }

    // registration stats
    const eventIds = events.map((e) => e.id);
    const regRes = await query(
      `SELECT event_id, status FROM registrations WHERE event_id = ANY($1)`,
      [eventIds]
    );
    const registrationStats = regRes.rows || [];

    const statsByEvent = {};
    registrationStats.forEach((reg) => {
      const id = reg.event_id;
      if (!statsByEvent[id]) statsByEvent[id] = { total: 0, checkedIn: 0, cancelled: 0 };
      statsByEvent[id].total++;
      if (reg.status === 'checked_in') statsByEvent[id].checkedIn++;
      if (reg.status === 'cancelled') statsByEvent[id].cancelled++;
    });

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

    return res
      .status(200)
      .json({ events: eventsWithStats, total, page: parseInt(page), limit: limitVal });
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

    // Criar o evento em transação e inserir categorias de tickets quando fornecidas
    try {
      const created = await withTransaction(async (client) => {
        const insertRes = await client.query(
          `INSERT INTO events (nome, descricao, data_inicio, data_fim, local, endereco, capacidade, modalidade, tipo_evento, publico_alvo, gerente, coordenador, solucao, unidade, tipo_acao, status, meta_participantes, configuracoes, codevento_sas)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
          [
            nome,
            descricao || null,
            dataInicio,
            dataFim || null,
            local,
            endereco || null,
            parseInt(capacidade) || 0,
            modalidade || null,
            tipoEvento || null,
            publicoAlvo || null,
            gerente || null,
            coordenador || null,
            solucao || null,
            unidade || null,
            tipoAcao || null,
            status,
            parseInt(metaParticipantes) || 0,
            configuracoes || {},
            codevento_sas || null,
          ]
        );

        const event = insertRes.rows[0];

        if (ticketCategories && ticketCategories.length > 0) {
          const insertValues = [];
          const params = [];
          ticketCategories.forEach((cat, i) => {
            const baseIdx = params.length + 1;
            insertValues.push(
              `($${baseIdx}, $${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6})`
            );
            params.push(
              event.id,
              cat.nome,
              cat.descricao || null,
              parseFloat(cat.preco) || 0,
              parseInt(cat.quantidadeDisponivel) || 0,
              cat.dataInicioVenda || null,
              cat.dataFimVenda || null
            );
          });

          const categoriesSql = `INSERT INTO ticket_categories (event_id, nome, descricao, preco, quantidade_disponivel, data_inicio_venda, data_fim_venda) VALUES ${insertValues.join(',')}`;
          await client.query(categoriesSql, params);
        }

        return event;
      });

      return res.status(201).json(created);
    } catch (e) {
      console.error('Erro ao criar evento (transação):', e);
      return res.status(500).json({ error: 'Erro ao criar evento' });
    }
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

    // Atualizar evento usando SQL e transação
    try {
      const updated = await withTransaction(async (client) => {
        // Build dynamic SET clause
        const fields = [];
        const params = [];
        let idx = 1;
        if (eventData.nome) {
          fields.push(`nome = $${idx++}`);
          params.push(eventData.nome);
        }
        if (eventData.descricao !== undefined) {
          fields.push(`descricao = $${idx++}`);
          params.push(eventData.descricao);
        }
        if (eventData.dataInicio !== undefined) {
          fields.push(`data_inicio = $${idx++}`);
          params.push(eventData.dataInicio);
        }
        if (eventData.dataFim !== undefined) {
          fields.push(`data_fim = $${idx++}`);
          params.push(eventData.dataFim);
        }
        if (eventData.local !== undefined) {
          fields.push(`local = $${idx++}`);
          params.push(eventData.local);
        }
        if (eventData.endereco !== undefined) {
          fields.push(`endereco = $${idx++}`);
          params.push(eventData.endereco);
        }
        if (eventData.capacidade !== undefined) {
          fields.push(`capacidade = $${idx++}`);
          params.push(parseInt(eventData.capacidade) || 0);
        }
        if (eventData.modalidade !== undefined) {
          fields.push(`modalidade = $${idx++}`);
          params.push(eventData.modalidade);
        }
        if (eventData.tipoEvento !== undefined) {
          fields.push(`tipo_evento = $${idx++}`);
          params.push(eventData.tipoEvento);
        }
        if (eventData.publicoAlvo !== undefined) {
          fields.push(`publico_alvo = $${idx++}`);
          params.push(eventData.publicoAlvo);
        }
        if (eventData.gerente !== undefined) {
          fields.push(`gerente = $${idx++}`);
          params.push(eventData.gerente);
        }
        if (eventData.coordenador !== undefined) {
          fields.push(`coordenador = $${idx++}`);
          params.push(eventData.coordenador);
        }
        if (eventData.solucao !== undefined) {
          fields.push(`solucao = $${idx++}`);
          params.push(eventData.solucao);
        }
        if (eventData.unidade !== undefined) {
          fields.push(`unidade = $${idx++}`);
          params.push(eventData.unidade);
        }
        if (eventData.tipoAcao !== undefined) {
          fields.push(`tipo_acao = $${idx++}`);
          params.push(eventData.tipoAcao);
        }
        if (eventData.status !== undefined) {
          fields.push(`status = $${idx++}`);
          params.push(eventData.status);
        }
        if (eventData.metaParticipantes !== undefined) {
          fields.push(`meta_participantes = $${idx++}`);
          params.push(parseInt(eventData.metaParticipantes) || 0);
        }
        if (eventData.configuracoes !== undefined) {
          fields.push(`configuracoes = $${idx++}`);
          params.push(eventData.configuracoes);
        }
        if (eventData.codevento_sas !== undefined) {
          fields.push(`codevento_sas = $${idx++}`);
          params.push(eventData.codevento_sas);
        }

        if (fields.length === 0) {
          // nothing to update, just return current row
          const r = await client.query('SELECT * FROM events WHERE id = $1 LIMIT 1', [id]);
          return r.rows[0];
        }

        params.push(id);
        const updateQuery = `UPDATE events SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`;
        const resUpdate = await client.query(updateQuery, params);
        const updatedEvent = resUpdate.rows[0];

        // Update ticket categories if provided
        if (ticketCategories && Array.isArray(ticketCategories)) {
          await client.query('DELETE FROM ticket_categories WHERE event_id = $1', [id]);
          if (ticketCategories.length > 0) {
            const insertValues = [];
            const p = [];
            ticketCategories.forEach(() => {
              const base = p.length + 1;
              insertValues.push(
                `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
              );
            });
            ticketCategories.forEach((cat) => {
              p.push(
                id,
                cat.nome,
                cat.descricao || null,
                parseFloat(cat.preco) || 0,
                parseInt(cat.quantidadeDisponivel) || 0,
                cat.dataInicioVenda || null,
                cat.dataFimVenda || null
              );
            });
            const sql = `INSERT INTO ticket_categories (event_id, nome, descricao, preco, quantidade_disponivel, data_inicio_venda, data_fim_venda) VALUES ${insertValues.join(',')}`;
            await client.query(sql, p);
          }
        }

        return updatedEvent;
      });

      return res.status(200).json(updated);
    } catch (e) {
      console.error('Erro ao atualizar evento (transação):', e);
      return res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
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

    // Excluir em transação para garantir consistência
    await withTransaction(async (client) => {
      // 1. Buscar registrations do evento
      const { rows: regRows } = await client.query(
        'SELECT id FROM registrations WHERE event_id = $1',
        [id]
      );

      if (regRows.length > 0) {
        const registrationIds = regRows.map((r) => r.id);

        // 2. Deletar check_ins relacionados às registrations
        await client.query('DELETE FROM check_ins WHERE registration_id = ANY($1::uuid[])', [
          registrationIds,
        ]);

        console.log(
          `[DELETE] Deletados check_ins de ${regRows.length} registrations do evento ${id}`
        );
      }

      // 3. Deletar registrations do evento
      await client.query('DELETE FROM registrations WHERE event_id = $1', [id]);

      console.log(`[DELETE] Deletadas ${regRows.length} registrations do evento ${id}`);

      // 4. Deletar ticket_categories do evento (se houver)
      const { rowCount: ticketCount } = await client.query(
        'DELETE FROM ticket_categories WHERE event_id = $1',
        [id]
      );

      if (ticketCount > 0) {
        console.log(`[DELETE] Deletadas ${ticketCount} categorias de ticket do evento ${id}`);
      }

      // 5. Deletar o evento
      const { rowCount } = await client.query('DELETE FROM events WHERE id = $1', [id]);

      if (rowCount === 0) {
        throw new Error('Evento não encontrado');
      }

      console.log(`[DELETE] Evento ${id} excluído com sucesso`);
    });

    return res.status(200).json({ message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Erro inesperado ao excluir evento:', error);

    if (error.message === 'Evento não encontrado') {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Aplicar middleware de autenticação para todos os métodos
export default withApiAuth(handler, {
  GET: ['events.view'],
  POST: ['events.manage'],
  PUT: ['events.manage'],
  DELETE: ['events.manage'],
});
