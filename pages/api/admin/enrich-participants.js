import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db as pool } from '../../../lib/config/database';

/**
 * API para enriquecimento em massa de dados de participantes via SAS
 *
 * Busca dados do sistema SAS para atualizar informações de participantes selecionados
 * (email, telefone, empresa, etc.)
 *
 * POST /api/admin/enrich-participants
 * Body: {
 *   participantIds: string[]  // Array de IDs dos participantes a enriquecer
 * }
 *
 * Retorna: {
 *   processed: number,
 *   enriched: number,
 *   failed: number,
 *   details: Array<{ participantId, cpf, status, message }>
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação e permissão de admin
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!session.user?.roles?.includes('admin')) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const { participantIds } = req.body;

    // Validar que participantIds foi fornecido
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        error: 'É necessário fornecer um array de IDs de participantes',
      });
    }

    // Buscar os participantes selecionados
    const query = `
      SELECT p.id, p.cpf, p.nome, p.email, p.telefone, p.company_id
      FROM participants p
      WHERE p.id = ANY($1)
      ORDER BY p.nome
    `;

    const participantsRes = await pool.query(query, [participantIds]);
    const participants = participantsRes.rows;

    if (participants.length === 0) {
      return res.status(200).json({
        processed: 0,
        enriched: 0,
        failed: 0,
        message: 'Nenhum participante precisa de enriquecimento',
        details: [],
      });
    }

    // Processar cada participante individualmente
    const results = {
      processed: 0,
      enriched: 0,
      failed: 0,
      details: [],
    };

    for (const participant of participants) {
      results.processed++;

      try {
        const enriched = await enrichParticipantFromSAS(participant);

        if (enriched.success) {
          results.enriched++;
          results.details.push({
            participantId: participant.id,
            cpf: participant.cpf,
            nome: participant.nome,
            status: 'success',
            message: 'Dados enriquecidos com sucesso',
            updatedFields: enriched.updatedFields,
          });
        } else {
          results.failed++;
          results.details.push({
            participantId: participant.id,
            cpf: participant.cpf,
            nome: participant.nome,
            status: 'failed',
            message: enriched.message || 'Falha ao enriquecer dados',
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          participantId: participant.id,
          cpf: participant.cpf,
          nome: participant.nome,
          status: 'error',
          message: error.message,
        });
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Erro no enriquecimento em massa:', error);
    return res.status(500).json({
      error: 'Erro ao enriquecer participantes',
      details: error.message,
    });
  }
}

/**
 * Busca dados do participante no SAS e atualiza no banco local
 */
async function enrichParticipantFromSAS(participant) {
  try {
    const cpfClean = participant.cpf.replace(/\D/g, '');

    // Buscar dados no SAS usando o mesmo endpoint que o search-participant
    const sasUrl = `${process.env.NEXT_PUBLIC_SEBRAE_API_URL}/SelecionarPessoaFisica`;
    const params = new URLSearchParams({ CgcCpf: cpfClean });
    const fullUrl = `${sasUrl}?${params.toString()}`;

    console.log(`[ENRICH] Buscando dados do SAS para CPF: ${cpfClean}`);
    console.log(`[ENRICH] URL: ${fullUrl}`);

    const sasResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-req': process.env.SEBRAE_API_KEY || '',
      },
    });

    console.log(`[ENRICH] SAS Response Status: ${sasResponse.status}`);

    if (!sasResponse.ok) {
      const errorText = await sasResponse.text();
      console.error(`[ENRICH] SAS Error: ${errorText}`);
      return {
        success: false,
        message: `SAS retornou status ${sasResponse.status}`,
      };
    }

    const responseText = await sasResponse.text();
    let sasData;
    try {
      sasData = JSON.parse(responseText);
    } catch (e) {
      console.error(`[ENRICH] Erro ao parsear resposta do SAS:`, responseText.substring(0, 200));
      return {
        success: false,
        message: 'Erro ao processar resposta do SAS',
      };
    }

    console.log(`[ENRICH] SAS Data:`, JSON.stringify(sasData).substring(0, 200));

    if (!sasData || (Array.isArray(sasData) && sasData.length === 0)) {
      return {
        success: false,
        message: 'Participante não encontrado no SAS',
      };
    }

    // Pegar o primeiro resultado se vier em array
    const cliente = Array.isArray(sasData) ? sasData[0] : sasData;

    if (!cliente) {
      return {
        success: false,
        message: 'Cliente não encontrado na resposta do SAS',
      };
    }

    // Extrair dados do formato do SAS
    const contatos = cliente.ListaInformacoesContato || [];
    const email = contatos.find((c) => c.CodComunic === 25)?.Numero || '';
    const telefone = contatos.find((c) => c.CodComunic === 5)?.Numero || '';

    // Buscar vínculo principal para empresa
    const vinculos = cliente.ListaVinculo || [];
    const vinculoPrincipal = vinculos.find((v) => v.IndPrincipal === 1) || vinculos[0];

    console.log(
      `[ENRICH] Dados extraídos - Email: ${email}, Tel: ${telefone}, Empresa: ${vinculoPrincipal?.NomeRazaoSocialPJ || 'N/A'}`
    );

    // Preparar dados para atualização
    const updates = [];
    const values = [];
    let paramIndex = 1;
    const updatedFields = [];

    // Email - atualizar se encontrado e for diferente e não for temp
    if (email && email !== participant.email && !email.includes('@temp.com')) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
      updatedFields.push('email');
      console.log(`[ENRICH] Atualizando email: ${participant.email} → ${email}`);
    }

    // Telefone - atualizar se encontrado e o atual estiver vazio
    if (telefone && (!participant.telefone || participant.telefone === '')) {
      updates.push(`telefone = $${paramIndex++}`);
      values.push(telefone);
      updatedFields.push('telefone');
      console.log(`[ENRICH] Atualizando telefone: ${participant.telefone} → ${telefone}`);
    }

    // Empresa - buscar ou criar se não tiver vínculo
    if (vinculoPrincipal && !participant.company_id) {
      const companyData = {
        cnpj: vinculoPrincipal.CgcCpf?.toString() || '',
        razaoSocial: vinculoPrincipal.NomeRazaoSocialPJ || '',
        cargo: vinculoPrincipal.DescCargCli || '',
      };

      const companyId = await getOrCreateCompany(companyData);
      if (companyId) {
        updates.push(`company_id = $${paramIndex++}`);
        values.push(companyId);
        updatedFields.push('company_id');
        console.log(`[ENRICH] Vinculando empresa: ${companyData.razaoSocial}`);
      }
    }

    // Se não há atualizações, retornar
    if (updates.length === 0) {
      console.log(`[ENRICH] Nenhum dado novo para atualizar`);
      return {
        success: false,
        message: 'Nenhum dado novo encontrado no SAS',
      };
    }

    // Atualizar participante
    updates.push(`updated_at = NOW()`);
    values.push(participant.id);

    const updateQuery = `
      UPDATE participants 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await pool.query(updateQuery, values);

    return {
      success: true,
      message: 'Dados enriquecidos com sucesso',
      updatedFields,
    };
  } catch (error) {
    console.error(`[ENRICH ERROR] Participante ${participant.cpf}:`, error);
    console.error(`[ENRICH ERROR] Stack:`, error.stack);
    return {
      success: false,
      message: `Erro: ${error.message}`,
    };
  }
}

/**
 * Busca ou cria empresa no banco de dados
 */
async function getOrCreateCompany(companyData) {
  try {
    if (!companyData || !companyData.cnpj || companyData.cnpj.trim() === '') {
      console.log(`[ENRICH] Dados de empresa inválidos ou CNPJ vazio`);
      return null;
    }

    const cnpj = companyData.cnpj.replace(/\D/g, '');
    const razaoSocial = companyData.razaoSocial?.trim() || '';

    if (!razaoSocial) {
      console.log(`[ENRICH] Razão social vazia para CNPJ ${cnpj}`);
      return null;
    }

    // Buscar empresa existente por CNPJ
    const companyRes = await pool.query('SELECT id FROM companies WHERE cnpj = $1 LIMIT 1', [cnpj]);

    if (companyRes.rows.length > 0) {
      console.log(`[ENRICH] Empresa encontrada: ${razaoSocial} (${cnpj})`);
      return companyRes.rows[0].id;
    }

    // Criar nova empresa
    const newCompanyRes = await pool.query(
      `INSERT INTO companies (cnpj, razao_social, nome_fantasia, created_at, updated_at)
       VALUES ($1, $2, $2, NOW(), NOW())
       RETURNING id`,
      [cnpj, razaoSocial]
    );

    console.log(`[ENRICH] Empresa criada: ${razaoSocial} (${cnpj})`);
    return newCompanyRes.rows[0].id;
  } catch (error) {
    console.error('[ENRICH] Erro ao buscar/criar empresa:', error);
    return null;
  }
}
