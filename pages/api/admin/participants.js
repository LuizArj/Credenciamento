import { withApiAuth } from '../../../utils/api-auth';
import { query, withTransaction } from '../../../lib/config/database';

async function handler(req, res) {
  console.log(
    `[API] /api/admin/participants ${req.method} - query=${JSON.stringify(req.query)} body=${req.method === 'GET' ? '{}' : JSON.stringify(req.body ? req.body : {})}`
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

// ===== GET - Buscar participantes =====
async function handleGet(req, res) {
  try {
    const {
      search,
      eventId,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const offset = (pageNum - 1) * pageSize;

    // Validar sortBy e sortOrder
    const validSortFields = ['nome', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    // Construir WHERE clause
    const params = [];
    let whereConditions = [];

    if (eventId) {
      params.push(eventId);
      whereConditions.push(`r.event_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const searchIndex = params.length;
      whereConditions.push(
        `(p.nome ILIKE $${searchIndex} OR p.cpf ILIKE $${searchIndex} OR p.email ILIKE $${searchIndex})`
      );
    }

    const where = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query para contar total (sem paginação)
    const countSql = eventId
      ? `
        SELECT COUNT(DISTINCT p.id)::int AS total
        FROM participants p
        INNER JOIN registrations r ON r.participant_id = p.id
        ${where}
      `
      : `
        SELECT COUNT(p.id)::int AS total
        FROM participants p
        ${where}
      `;

    const { rows: countRows } = await query(countSql, params);
    const total = countRows[0]?.total || 0;

    if (total === 0) {
      return res.status(200).json({
        participants: [],
        pagination: { page: pageNum, limit: pageSize, total: 0, totalPages: 0 },
      });
    }

    // Query para buscar participantes com paginação e ordenação no banco
    const dataSql = eventId
      ? `
        SELECT DISTINCT ON (p.id)
               p.id, p.cpf, p.nome, p.email, p.telefone, p.cargo, p.fonte, p.company_id, p.created_at, p.updated_at,
               c.id AS c_id, c.cnpj, c.razao_social, c.nome_fantasia
        FROM participants p
        INNER JOIN registrations r ON r.participant_id = p.id
        LEFT JOIN companies c ON c.id = p.company_id
        ${where}
        ORDER BY p.id, p.${sortField} ${sortDirection.toUpperCase()}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `
      : `
        SELECT p.id, p.cpf, p.nome, p.email, p.telefone, p.cargo, p.fonte, p.company_id, p.created_at, p.updated_at,
               c.id AS c_id, c.cnpj, c.razao_social, c.nome_fantasia
        FROM participants p
        LEFT JOIN companies c ON c.id = p.company_id
        ${where}
        ORDER BY p.${sortField} ${sortDirection.toUpperCase()}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

    const dataParams = [...params, pageSize, offset];
    const { rows } = await query(dataSql, dataParams);

    // Mapear resultados
    const participants = rows.map((row) => ({
      id: row.id,
      cpf: row.cpf,
      nome: row.nome,
      email: row.email || null,
      telefone: row.telefone || null,
      cargo: row.cargo || null,
      fonte: row.fonte || null,
      company: row.c_id
        ? {
            id: row.c_id,
            cnpj: row.cnpj,
            razao_social: row.razao_social,
            nome_fantasia: row.nome_fantasia,
          }
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const totalPages = Math.ceil(total / pageSize);

    return res.status(200).json({
      participants,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Erro inesperado ao buscar participantes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// ===== POST - Criar participante =====
async function handlePost(req, res) {
  try {
    const {
      cpf,
      nome,
      email,
      telefone,
      dataNascimento,
      genero,
      escolaridade,
      profissao,
      cargo,
      endereco,
      fonte = 'manual',
      dadosExternos = {},
      company, // pode ser um ID ou dados da empresa
    } = req.body;

    // Validações
    if (!cpf || !nome) {
      return res.status(400).json({
        error: 'CPF e nome são obrigatórios',
      });
    }

    // Validar formato do CPF (básico)
    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      return res.status(400).json({
        error: 'CPF deve ter 11 dígitos',
      });
    }

    // Verificar se CPF já existe
    const { rows: existingRows } = await query(
      'SELECT id, cpf FROM participants WHERE cpf = $1 LIMIT 1',
      [cpf]
    );
    const existingParticipant = existingRows[0];
    if (existingParticipant) {
      return res.status(400).json({ error: 'Já existe um participante com este CPF' });
    }

    // Processar empresa se fornecida
    let companyId = null;
    if (company) {
      if (typeof company === 'string') {
        companyId = company;
      } else if (company.cnpj) {
        const { rows: existingCompanyRows } = await query(
          'SELECT id FROM companies WHERE cnpj = $1 LIMIT 1',
          [company.cnpj]
        );
        const existingCompany = existingCompanyRows[0];
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { rows: newCompanyRows } = await query(
            `INSERT INTO companies (cnpj, razao_social, nome_fantasia, telefone, email, endereco)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, cnpj, razao_social, nome_fantasia`,
            [
              company.cnpj,
              company.razaoSocial || company.razao_social || null,
              company.nomeFantasia || company.nome_fantasia || null,
              company.telefone || null,
              company.email || null,
              company.endereco || null,
            ]
          );
          const newCompany = newCompanyRows[0];
          if (!newCompany) {
            console.error('Erro ao criar empresa: sem retorno');
            return res.status(500).json({ error: 'Erro ao criar empresa' });
          }
          companyId = newCompany.id;
        }
      }
    }

    // Criar o participante
    // Inserir participante (em transação para segurança)
    const result = await withTransaction(async (client) => {
      const insertRes = await client.query(
        `INSERT INTO participants (cpf, nome, email, telefone, data_nascimento, genero, escolaridade, profissao, company_id, cargo, endereco, fonte, dados_externos)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id, cpf, nome, email, telefone, data_nascimento, genero, escolaridade, profissao, company_id, cargo, endereco, fonte, dados_externos, created_at, updated_at`,
        [
          cpf,
          nome,
          email || null,
          telefone || null,
          dataNascimento || null,
          genero || null,
          escolaridade || null,
          profissao || null,
          companyId || null,
          cargo || null,
          endereco || null,
          fonte || 'manual',
          dadosExternos || {},
        ]
      );

      const inserted = insertRes.rows[0];
      if (!inserted) throw new Error('Falha ao inserir participante');

      // Buscar empresa associada para formatar retorno
      let companyRow = null;
      if (inserted.company_id) {
        const compRes = await client.query(
          'SELECT id, cnpj, razao_social, nome_fantasia FROM companies WHERE id = $1',
          [inserted.company_id]
        );
        companyRow = compRes.rows[0] || null;
      }

      return { ...inserted, companies: companyRow };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Erro inesperado ao criar participante:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// ===== PUT - Atualizar participante =====
async function handlePut(req, res) {
  try {
    const { id, company, ...participantData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID do participante é obrigatório' });
    }

    // Verificar se o participante existe
    const { rows: existingParticipantRows } = await query(
      'SELECT id, cpf FROM participants WHERE id = $1 LIMIT 1',
      [id]
    );
    const existingParticipant = existingParticipantRows[0];
    if (!existingParticipant) {
      return res.status(404).json({ error: 'Participante não encontrado' });
    }

    // Se o CPF foi alterado, verificar se não há conflito
    if (participantData.cpf && participantData.cpf !== existingParticipant.cpf) {
      const { rows: cpfConflictRows } = await query(
        'SELECT id FROM participants WHERE cpf = $1 AND id <> $2 LIMIT 1',
        [participantData.cpf, id]
      );
      if (cpfConflictRows[0]) {
        return res.status(400).json({ error: 'Já existe outro participante com este CPF' });
      }
    }

    // Processar empresa se fornecida
    let companyId = undefined;
    if (company !== undefined) {
      if (company === null) {
        companyId = null;
      } else if (typeof company === 'string') {
        companyId = company;
      } else if (company.cnpj) {
        const { rows: existingCompanyRows } = await query(
          'SELECT id FROM companies WHERE cnpj = $1 LIMIT 1',
          [company.cnpj]
        );
        const existingCompany = existingCompanyRows[0];
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { rows: newCompanyRows } = await query(
            `INSERT INTO companies (cnpj, razao_social, nome_fantasia, telefone, email, endereco)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [
              company.cnpj,
              company.razaoSocial || company.razao_social || null,
              company.nomeFantasia || company.nome_fantasia || null,
              company.telefone || null,
              company.email || null,
              company.endereco || null,
            ]
          );
          const newCompany = newCompanyRows[0];
          if (!newCompany) {
            console.error('Erro ao criar empresa: sem retorno');
            return res.status(500).json({ error: 'Erro ao criar empresa' });
          }
          companyId = newCompany.id;
        }
      }
    }

    // Preparar dados para atualização
    const updateData = {};
    if (participantData.cpf) updateData.cpf = participantData.cpf;
    if (participantData.nome) updateData.nome = participantData.nome;
    if (participantData.email !== undefined) updateData.email = participantData.email;
    if (participantData.telefone !== undefined) updateData.telefone = participantData.telefone;
    if (participantData.dataNascimento !== undefined)
      updateData.data_nascimento = participantData.dataNascimento;
    if (participantData.genero !== undefined) updateData.genero = participantData.genero;
    if (participantData.escolaridade !== undefined)
      updateData.escolaridade = participantData.escolaridade;
    if (participantData.profissao !== undefined) updateData.profissao = participantData.profissao;
    if (participantData.cargo !== undefined) updateData.cargo = participantData.cargo;
    if (participantData.endereco !== undefined) updateData.endereco = participantData.endereco;
    if (participantData.fonte) updateData.fonte = participantData.fonte;
    if (participantData.dadosExternos !== undefined)
      updateData.dados_externos = participantData.dadosExternos;
    if (participantData.ativo !== undefined) updateData.ativo = participantData.ativo;
    if (companyId !== undefined) updateData.company_id = companyId;

    // Atualizar participante (em transação)
    const updated = await withTransaction(async (client) => {
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const [k, v] of Object.entries(updateData)) {
        sets.push(`${k} = $${idx}`);
        vals.push(v);
        idx++;
      }
      vals.push(id);
      const sql = `UPDATE participants SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, cpf, nome, email, telefone, company_id, created_at, updated_at`;
      const resUpdate = await client.query(sql, vals);
      const part = resUpdate.rows[0];
      if (!part) throw new Error('Falha ao atualizar participante');
      let companyRow = null;
      if (part.company_id) {
        const compRes = await client.query(
          'SELECT id, cnpj, razao_social, nome_fantasia FROM companies WHERE id = $1',
          [part.company_id]
        );
        companyRow = compRes.rows[0] || null;
      }
      return { ...part, companies: companyRow };
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erro inesperado ao atualizar participante:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// ===== DELETE - Remover participante =====
async function handleDelete(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID do participante é obrigatório' });
    }

    // Excluir em transação para garantir consistência
    await withTransaction(async (client) => {
      // 1. Buscar registrations do participante
      const { rows: regRows } = await client.query(
        'SELECT id FROM registrations WHERE participant_id = $1',
        [id]
      );

      if (regRows.length > 0) {
        const registrationIds = regRows.map((r) => r.id);

        // 2. Deletar check_ins relacionados às registrations
        await client.query('DELETE FROM check_ins WHERE registration_id = ANY($1::uuid[])', [
          registrationIds,
        ]);

        console.log(`[DELETE] Deletados ${regRows.length} check_ins do participante ${id}`);
      }

      // 3. Deletar registrations do participante
      await client.query('DELETE FROM registrations WHERE participant_id = $1', [id]);

      console.log(`[DELETE] Deletadas ${regRows.length} registrations do participante ${id}`);

      // 4. Deletar o participante
      const { rowCount } = await client.query('DELETE FROM participants WHERE id = $1', [id]);

      if (rowCount === 0) {
        throw new Error('Participante não encontrado');
      }

      console.log(`[DELETE] Participante ${id} excluído com sucesso`);
    });

    return res.status(200).json({ message: 'Participante excluído com sucesso' });
  } catch (error) {
    console.error('Erro inesperado ao excluir participante:', error);

    if (error.message === 'Participante não encontrado') {
      return res.status(404).json({ error: 'Participante não encontrado' });
    }

    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export default withApiAuth(handler, {
  GET: ['admin_only'],
  POST: ['admin_only'],
  PUT: ['admin_only'],
  DELETE: ['admin_only'],
});
