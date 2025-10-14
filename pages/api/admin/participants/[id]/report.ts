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
      total_events: number;
      total_check_ins: number;
      last_activity: string | null;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
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
    const userRoles = session.user.roles || [];
    if (
      !userRoles.includes('admin') &&
      !userRoles.includes('manager') &&
      !userRoles.includes('operator')
    ) {
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

    // Buscar histórico de participação (sempre buscamos para derivar evento/estatísticas atuais)
    const fullHistory = await supabaseAdminService.getParticipantHistory(participant.cpf);

    // Buscar dados do evento (se solicitado). Como não usamos mais participants.event_id,
    // derivamos o "evento atual" a partir do histórico mais recente.
    let event = null as any;
    if (includeEvents) {
      const latest = fullHistory[0]; // getParticipantHistory já ordena por data_inscricao desc
      if (latest?.event_id) {
        event = await supabaseAdminService.getEventById(latest.event_id);
      }
    }

    // Preparar histórico conforme flag
    const history = includeHistory
      ? fullHistory.map((h: any) => ({
          id: `${participant.id}-${h.event_id}`,
          action: h.checked_in
            ? 'checkin'
            : h.status_credenciamento === 'credentialed'
              ? 'credenciar'
              : 'atualizar',
          status_before: null,
          status_after: h.status_credenciamento,
          user_id: null,
          user_name: undefined,
          created_at: h.checked_in_at || h.credenciado_em || h.event_data_inicio,
          metadata: {
            event_id: h.event_id,
            event_nome: h.event_nome,
          },
        }))
      : undefined;

    // Calcular estatísticas alinhadas com o que o UI espera
    // UI espera: stats.total_events, stats.total_check_ins, stats.last_activity
    const total_events = fullHistory.length;
    const total_check_ins = fullHistory.filter((h) => h.checked_in).length;
    const last_activity = fullHistory[0]?.credenciado_em || null;

    const stats = {
      total_events,
      total_check_ins,
      last_activity,
    };

    // Ajustar participant com status e check-in agregados
    const enrichedParticipant = {
      ...participant,
      status_credenciamento: fullHistory.some((h) => h.status_credenciamento === 'credentialed')
        ? 'credenciado'
        : 'nao_credenciado',
      checked_in_at: fullHistory.find((h) => h.checked_in_at)?.checked_in_at || null,
    };

    console.log(`[ParticipantReport] ✅ Relatório gerado com sucesso`);

    // --------------------------------------------------------------------------
    // 5. SUCCESS RESPONSE
    // --------------------------------------------------------------------------
    return res.status(200).json({
      success: true,
      data: {
        participant: enrichedParticipant,
        event: includeEvents ? event : undefined,
        history: history || undefined,
        stats,
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
