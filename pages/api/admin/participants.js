import { withApiAuth } from '../../../utils/api-auth';
import { query, withTransaction } from '../../../lib/config/database';

async function handler(req, res) {
  console.log(`[API] /api/admin/participants ${req.method} - query=${JSON.stringify(req.query)} body=${req.method==='GET'? '{}': JSON.stringify(req.body ? req.body : {})}`);
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

// ===== GET - Buscar participantes (somente credenciados) =====
async function handleGet(req, res) {
  try {
    const { search, eventId, page = 1, limit = 10 } = req.query;

    // Buscar registros de inscrições (registrations) com status 'confirmed'
    // Vamos buscar os participantes relacionados e as empresas (left join).
    const params = ['confirmed'];
    let where = 'r.status = $1';

    if (eventId) {
      params.push(eventId);
      where += ` AND r.event_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (p.nome ILIKE $${params.length} OR p.cpf ILIKE $${params.length} OR p.email ILIKE $${params.length})`;
    }

    const sql = `
      SELECT r.participant_id, r.status,
             p.id AS p_id, p.cpf, p.nome, p.email, p.telefone, p.cargo, p.fonte, p.company_id, p.created_at, p.updated_at,
             c.id AS company_id, c.cnpj, c.razao_social, c.nome_fantasia
      FROM registrations r
      JOIN participants p ON p.id = r.participant_id
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE ${where}
      ORDER BY r.participant_id ASC
    `;

    const { rows: regs } = await query(sql, params);

    if (!regs || regs.length === 0) {
      return res.status(200).json({
        participants: [],
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 },
      });
    }

    // Deduplicar por CPF e consolidar informações em um único perfil
    const byCpf = new Map();

    const normalizeCpf = (cpf) => (cpf || '').replace(/\D/g, '');

    for (const row of regs) {
      const p = {
        id: row.p_id,
        cpf: row.cpf,
        nome: row.nome,
        email: row.email,
        telefone: row.telefone,
        cargo: row.cargo,
        fonte: row.fonte,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      const company = row.company_id
        ? { id: row.company_id, cnpj: row.cnpj, razao_social: row.razao_social, nome_fantasia: row.nome_fantasia }
        : null;

      const cpfKey = normalizeCpf(p.cpf);

      if (!byCpf.has(cpfKey)) {
        byCpf.set(cpfKey, {
          id: p.id,
          cpf: p.cpf,
          nome: p.nome,
          email: p.email || null,
          telefone: p.telefone || null,
          cargo: p.cargo || null,
          fonte: p.fonte || null,
          company,
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      } else {
        const acc = byCpf.get(cpfKey);
        acc.nome = acc.nome || p.nome;
        acc.email = acc.email || p.email;
        acc.telefone = acc.telefone || p.telefone;
        acc.cargo = acc.cargo || p.cargo;
        acc.fonte = acc.fonte || p.fonte;
        if (!acc.company && company) acc.company = company;
        if (p.updated_at && (!acc.updated_at || p.updated_at > acc.updated_at)) acc.updated_at = p.updated_at;
      }
    }

    // Ordenar por nome e paginar após deduplicação
    const all = Array.from(byCpf.values()).sort((a, b) =>
      (a.nome || '').localeCompare(b.nome || '')
    );
    const total = all.length;
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const start = (pageNum - 1) * pageSize;
    const sliced = all.slice(start, start + pageSize);

    return res.status(200).json({
      participants: sliced,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
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
    const { rows: existingRows } = await query('SELECT id, cpf FROM participants WHERE cpf = $1 LIMIT 1', [cpf]);
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
        const { rows: existingCompanyRows } = await query('SELECT id FROM companies WHERE cnpj = $1 LIMIT 1', [company.cnpj]);
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
        const compRes = await client.query('SELECT id, cnpj, razao_social, nome_fantasia FROM companies WHERE id = $1', [inserted.company_id]);
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
    const { rows: existingParticipantRows } = await query('SELECT id, cpf FROM participants WHERE id = $1 LIMIT 1', [id]);
    const existingParticipant = existingParticipantRows[0];
    if (!existingParticipant) {
      return res.status(404).json({ error: 'Participante não encontrado' });
    }

    // Se o CPF foi alterado, verificar se não há conflito
    if (participantData.cpf && participantData.cpf !== existingParticipant.cpf) {
      const { rows: cpfConflictRows } = await query('SELECT id FROM participants WHERE cpf = $1 AND id <> $2 LIMIT 1', [participantData.cpf, id]);
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
        const { rows: existingCompanyRows } = await query('SELECT id FROM companies WHERE cnpj = $1 LIMIT 1', [company.cnpj]);
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
        const compRes = await client.query('SELECT id, cnpj, razao_social, nome_fantasia FROM companies WHERE id = $1', [part.company_id]);
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

    // Verificar se há registrações para este participante
    const { rows: regRows } = await query('SELECT id FROM registrations WHERE participant_id = $1 LIMIT 1', [id]);
    if (regRows.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir participante com registrações em eventos. Desative o participante em vez de excluí-lo.' });
    }

    await query('DELETE FROM participants WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Participante excluído com sucesso' });
  } catch (error) {
    console.error('Erro inesperado ao excluir participante:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export default withApiAuth(handler, {
  GET: ['participants.view'],
  POST: ['participants.manage'],
  PUT: ['participants.manage'],
  DELETE: ['participants.manage'],
});
