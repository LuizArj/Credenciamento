import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import pool from '../../../lib/config/database';

/**
 * API para enriquecimento em massa de dados de participantes via SAS
 * 
 * Busca participantes que precisam de enriquecimento e atualiza um por vez
 * com dados do sistema SAS (email, telefone, empresa, etc.)
 * 
 * POST /api/admin/enrich-participants
 * Body: { 
 *   eventId?: string,  // Opcional: enriquecer apenas participantes de um evento
 *   limit?: number     // Opcional: quantidade máxima a processar (default: 50)
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

    const { eventId, limit = 50 } = req.body;

    // Buscar participantes que precisam de enriquecimento
    // Critério: email temporário ou telefone vazio
    let query = `
      SELECT DISTINCT p.id, p.cpf, p.nome, p.email, p.telefone, p.company_id
      FROM participants p
    `;

    const params = [];
    
    if (eventId) {
      query += `
        INNER JOIN registrations r ON r.participant_id = p.id
        WHERE r.event_id = $1
      `;
      params.push(eventId);
    } else {
      query += ` WHERE 1=1 `;
    }

    // Identificar participantes que precisam enriquecimento
    query += `
      AND (
        p.email LIKE '%@temp.com' 
        OR p.telefone IS NULL 
        OR p.telefone = ''
        OR p.company_id IS NULL
      )
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const participantsRes = await pool.query(query, params);
    const participants = participantsRes.rows;

    if (participants.length === 0) {
      return res.status(200).json({
        processed: 0,
        enriched: 0,
        failed: 0,
        message: 'Nenhum participante precisa de enriquecimento',
        details: []
      });
    }

    // Processar cada participante individualmente
    const results = {
      processed: 0,
      enriched: 0,
      failed: 0,
      details: []
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
            updatedFields: enriched.updatedFields
          });
        } else {
          results.failed++;
          results.details.push({
            participantId: participant.id,
            cpf: participant.cpf,
            nome: participant.nome,
            status: 'failed',
            message: enriched.message || 'Falha ao enriquecer dados'
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          participantId: participant.id,
          cpf: participant.cpf,
          nome: participant.nome,
          status: 'error',
          message: error.message
        });
      }
    }

    return res.status(200).json(results);

  } catch (error) {
    console.error('Erro no enriquecimento em massa:', error);
    return res.status(500).json({ 
      error: 'Erro ao enriquecer participantes',
      details: error.message 
    });
  }
}

/**
 * Busca dados do participante no SAS e atualiza no banco local
 */
async function enrichParticipantFromSAS(participant) {
  try {
    const cpfClean = participant.cpf.replace(/\D/g, '');

    // Buscar dados no SAS
    const sasUrl = `${process.env.NEXT_PUBLIC_SAS_API_URL}/participantes`;
    const sasResponse = await fetch(`${sasUrl}?cpf=${cpfClean}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SAS_API_TOKEN || ''}`
      }
    });

    if (!sasResponse.ok) {
      return {
        success: false,
        message: `SAS retornou status ${sasResponse.status}`
      };
    }

    const sasData = await sasResponse.json();

    if (!sasData || sasData.length === 0) {
      return {
        success: false,
        message: 'Participante não encontrado no SAS'
      };
    }

    // Pegar o primeiro resultado (mais recente)
    const participantData = Array.isArray(sasData) ? sasData[0] : sasData;

    // Preparar dados para atualização
    const updates = [];
    const values = [];
    let paramIndex = 1;
    const updatedFields = [];

    // Email
    if (participantData.email && 
        participantData.email !== participant.email && 
        !participantData.email.includes('@temp.com')) {
      updates.push(`email = $${paramIndex++}`);
      values.push(participantData.email);
      updatedFields.push('email');
    }

    // Telefone
    if (participantData.telefone && 
        (!participant.telefone || participant.telefone === '')) {
      updates.push(`telefone = $${paramIndex++}`);
      values.push(participantData.telefone);
      updatedFields.push('telefone');
    }

    // Empresa (buscar ou criar)
    if (participantData.empresa && !participant.company_id) {
      const companyId = await getOrCreateCompany(participantData.empresa);
      if (companyId) {
        updates.push(`company_id = $${paramIndex++}`);
        values.push(companyId);
        updatedFields.push('company_id');
      }
    }

    // Se não há atualizações, retornar
    if (updates.length === 0) {
      return {
        success: false,
        message: 'Nenhum dado novo encontrado no SAS'
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
      updatedFields
    };

  } catch (error) {
    console.error(`Erro ao enriquecer participante ${participant.cpf}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Busca ou cria empresa no banco de dados
 */
async function getOrCreateCompany(companyName) {
  try {
    if (!companyName || companyName.trim() === '') {
      return null;
    }

    const name = companyName.trim();

    // Buscar empresa existente
    const companyRes = await pool.query(
      'SELECT id FROM companies WHERE UPPER(nome) = UPPER($1) LIMIT 1',
      [name]
    );

    if (companyRes.rows.length > 0) {
      return companyRes.rows[0].id;
    }

    // Criar nova empresa
    const newCompanyRes = await pool.query(
      `INSERT INTO companies (nome, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       RETURNING id`,
      [name]
    );

    return newCompanyRes.rows[0].id;

  } catch (error) {
    console.error('Erro ao buscar/criar empresa:', error);
    return null;
  }
}
