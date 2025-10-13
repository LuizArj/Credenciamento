/**
 * API Route: Participant Report
 * 
 * @route GET /api/admin/participants/[id]/report
 * @description Gera relatório detalhado de um participante
 * @auth Requer autenticação admin
 * @version 1.0.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { participantReportQuerySchema } from '@/schemas';
import { supabaseAdminService } from '@/services';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ParticipantReportSuccess {
  success: true;
  data: {
    participant: any;
    event?: any;
    history?: any[];
    stats?: {
      total_eventos: number;
      credenciados: number;
      pendentes: number;
      checked_in: number;
      taxa_presenca: number;
    };
  };
  message: string;
}

interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

type ApiResponse = ParticipantReportSuccess | ApiError;

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // --------------------------------------------------------------------------
  // 1. METHOD VALIDATION
  // --------------------------------------------------------------------------
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Método ${req.method} não é suportado. Use GET.`,
    });
  }

  // --------------------------------------------------------------------------
  // 2. AUTHENTICATION
  // --------------------------------------------------------------------------
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Autenticação necessária para acessar este recurso.',
      });
    }

    // Verificar permissões
    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('admin') && !userRoles.includes('manager') && !userRoles.includes('operator')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Você não tem permissão para acessar relatórios de participantes.',
      });
    }
  } catch (authError) {
    console.error('[ParticipantReport] Erro na autenticação:', authError);
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      message: 'Erro ao validar autenticação.',
    });
  }

  // --------------------------------------------------------------------------
  // 3. REQUEST VALIDATION
  // --------------------------------------------------------------------------
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Bad request',
      message: 'ID do participante é obrigatório.',
    });
  }

  const queryParams = {
    participantId: id,
    includeEvents: req.query.includeEvents !== 'false', // true por padrão
    includeHistory: req.query.includeHistory !== 'false', // true por padrão
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const validation = participantReportQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Bad request',
      message: 'Parâmetros inválidos.',
      details: process.env.NODE_ENV === 'development' ? validation.error.issues : undefined,
    });
  }

  const { participantId, includeEvents, includeHistory } = validation.data;

  // --------------------------------------------------------------------------
  // 4. BUSINESS LOGIC
  // --------------------------------------------------------------------------
  try {
    console.log(`[ParticipantReport] Gerando relatório do participante ${participantId}`);

    // Buscar dados do participante
    const participant = await supabaseAdminService.getParticipantById(participantId);

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Participante não encontrado.',
      });
    }

    // Buscar dados do evento (se solicitado)
    let event = null;
    if (includeEvents && participant.event_id) {
      event = await supabaseAdminService.getEventById(participant.event_id);
    }

    // Buscar histórico de participação
    let history = null;
    let stats = null;
    if (includeHistory) {
      history = await supabaseAdminService.getParticipantHistory(participant.cpf);

      // Calcular estatísticas do histórico
      const total_eventos = history.length;
      const credenciados = history.filter(h => h.status_credenciamento === 'credentialed').length;
      const pendentes = history.filter(h => h.status_credenciamento === 'pending').length;
      const checked_in = history.filter(h => h.checked_in).length;
      const taxa_presenca = credenciados > 0 ? (checked_in / credenciados) * 100 : 0;

      stats = {
        total_eventos,
        credenciados,
        pendentes,
        checked_in,
        taxa_presenca,
      };
    }

    console.log(`[ParticipantReport] ✅ Relatório gerado com sucesso`);

    // --------------------------------------------------------------------------
    // 5. SUCCESS RESPONSE
    // --------------------------------------------------------------------------
    return res.status(200).json({
      success: true,
      data: {
        participant,
        event: includeEvents ? event : undefined,
        history: includeHistory ? history || [] : undefined,
        stats: stats || undefined,
      },
      message: 'Relatório gerado com sucesso.',
    });

  } catch (error: any) {
    // --------------------------------------------------------------------------
    // 6. ERROR HANDLING
    // --------------------------------------------------------------------------
    console.error('[ParticipantReport] Erro ao gerar relatório:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro inesperado ao gerar relatório.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
