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

// ===== GET - Buscar participantes (somente credenciados) =====
async function handleGet(req, res) {
  try {
    const { search, eventId, page = 1, limit = 10 } = req.query;

    // Buscar registros de inscrições (registrations) com status credenciado
    // Consideramos credenciado quando status === 'confirmed'
    let query = supabaseAdmin
      .from('registrations')
      .select(
        `
        participant_id,
        status,
        participants!inner (
          id,
          cpf,
          nome,
          email,
          telefone,
          cargo,
          fonte,
          company_id,
          created_at,
          updated_at,
          companies (
            id,
            cnpj,
            razao_social,
            nome_fantasia
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('status', 'confirmed')
      .order('participant_id', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (search) {
      // Buscar por nome/cpf/email do participante
      // PostgREST permite referenciar colunas aninhadas usando o caminho
      query = query.or(
        `participants.nome.ilike.%${search}%,participants.cpf.ilike.%${search}%,participants.email.ilike.%${search}%`
      );
    }

    const { data: regs, error } = await query;

    if (error) {
      console.error('Erro ao buscar participantes credenciados:', error);
      return res.status(500).json({ error: 'Erro ao buscar participantes credenciados' });
    }

    if (!regs || regs.length === 0) {
      return res.status(200).json({
        participants: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
        },
      });
    }

    // Deduplicar por CPF e consolidar informações em um único perfil
    const byCpf = new Map();

    const normalizeCpf = (cpf) => (cpf || '').replace(/\D/g, '');

    for (const row of regs) {
      const p = row.participants;
      if (!p) continue;
      const cpfKey = normalizeCpf(p.cpf);

      const company = p.companies || null;

      if (!byCpf.has(cpfKey)) {
        byCpf.set(cpfKey, {
          id: p.id,
          cpf: p.cpf,
          nome: p.nome,
          email: p.email || null,
          telefone: p.telefone || null,
          cargo: p.cargo || null,
          fonte: p.fonte || null,
          company: company
            ? {
                id: company.id,
                cnpj: company.cnpj,
                razao_social: company.razao_social,
                nome_fantasia: company.nome_fantasia,
              }
            : null,
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      } else {
        // Concatenar informações faltantes
        const acc = byCpf.get(cpfKey);
        acc.nome = acc.nome || p.nome;
        acc.email = acc.email || p.email;
        acc.telefone = acc.telefone || p.telefone;
        acc.cargo = acc.cargo || p.cargo;
        acc.fonte = acc.fonte || p.fonte;
        if (!acc.company && company) {
          acc.company = {
            id: company.id,
            cnpj: company.cnpj,
            razao_social: company.razao_social,
            nome_fantasia: company.nome_fantasia,
          };
        }
        // Preferir updated_at mais recente
        if (p.updated_at && (!acc.updated_at || p.updated_at > acc.updated_at)) {
          acc.updated_at = p.updated_at;
        }
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
    const { data: existingParticipant } = await supabaseAdmin
      .from('participants')
      .select('id, cpf')
      .eq('cpf', cpf)
      .single();

    if (existingParticipant) {
      return res.status(400).json({
        error: 'Já existe um participante com este CPF',
      });
    }

    // Processar empresa se fornecida
    let companyId = null;
    if (company) {
      if (typeof company === 'string') {
        // É um ID de empresa existente
        companyId = company;
      } else if (company.cnpj) {
        // São dados de uma nova empresa
        const { data: existingCompany } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('cnpj', company.cnpj)
          .single();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          // Criar nova empresa
          const { data: newCompany, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert([
              {
                cnpj: company.cnpj,
                razao_social: company.razaoSocial || company.razao_social,
                nome_fantasia: company.nomeFantasia || company.nome_fantasia,
                telefone: company.telefone,
                email: company.email,
                endereco: company.endereco,
              },
            ])
            .select()
            .single();

          if (companyError) {
            console.error('Erro ao criar empresa:', companyError);
            return res.status(500).json({ error: 'Erro ao criar empresa' });
          }

          companyId = newCompany.id;
        }
      }
    }

    // Criar o participante
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('participants')
      .insert([
        {
          cpf,
          nome,
          email,
          telefone,
          data_nascimento: dataNascimento,
          genero,
          escolaridade,
          profissao,
          company_id: companyId,
          cargo,
          endereco,
          fonte,
          dados_externos: dadosExternos,
        },
      ])
      .select(
        `
        *,
        companies (
          id,
          cnpj,
          razao_social,
          nome_fantasia
        )
      `
      )
      .single();

    if (participantError) {
      console.error('Erro ao criar participante:', participantError);
      return res.status(500).json({ error: 'Erro ao criar participante' });
    }

    return res.status(201).json(participant);
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
    const { data: existingParticipant, error: checkError } = await supabaseAdmin
      .from('participants')
      .select('id, cpf')
      .eq('id', id)
      .single();

    if (checkError || !existingParticipant) {
      return res.status(404).json({ error: 'Participante não encontrado' });
    }

    // Se o CPF foi alterado, verificar se não há conflito
    if (participantData.cpf && participantData.cpf !== existingParticipant.cpf) {
      const { data: cpfConflict } = await supabaseAdmin
        .from('participants')
        .select('id')
        .eq('cpf', participantData.cpf)
        .neq('id', id)
        .single();

      if (cpfConflict) {
        return res.status(400).json({
          error: 'Já existe outro participante com este CPF',
        });
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
        const { data: existingCompany } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('cnpj', company.cnpj)
          .single();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert([
              {
                cnpj: company.cnpj,
                razao_social: company.razaoSocial || company.razao_social,
                nome_fantasia: company.nomeFantasia || company.nome_fantasia,
                telefone: company.telefone,
                email: company.email,
                endereco: company.endereco,
              },
            ])
            .select()
            .single();

          if (companyError) {
            console.error('Erro ao criar empresa:', companyError);
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

    // Atualizar participante
    const { data: updatedParticipant, error: updateError } = await supabaseAdmin
      .from('participants')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        companies (
          id,
          cnpj,
          razao_social,
          nome_fantasia
        )
      `
      )
      .single();

    if (updateError) {
      console.error('Erro ao atualizar participante:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar participante' });
    }

    return res.status(200).json(updatedParticipant);
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
    const { data: registrations, error: checkError } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('participant_id', id)
      .limit(1);

    if (checkError) {
      console.error('Erro ao verificar registrações:', checkError);
      return res.status(500).json({ error: 'Erro ao verificar registrações do participante' });
    }

    if (registrations && registrations.length > 0) {
      return res.status(400).json({
        error:
          'Não é possível excluir participante com registrações em eventos. Desative o participante em vez de excluí-lo.',
      });
    }

    // Excluir o participante
    const { error: deleteError } = await supabaseAdmin.from('participants').delete().eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir participante:', deleteError);
      return res.status(500).json({ error: 'Erro ao excluir participante' });
    }

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
