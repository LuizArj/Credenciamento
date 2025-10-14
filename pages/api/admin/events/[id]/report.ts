/**
 * API Route: Event Report
 *
 * @route GET /api/admin/events/[id]/report
 * @description Gera relatório detalhado de um evento
 * @auth Requer autenticação admin
 * @version 1.0.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { eventReportQuerySchema } from '@/schemas';
import { supabaseAdminService, sasService } from '@/services';
import { normalizeCPF } from '@/lib/utils/cpf';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface EventReportSuccess {
  success: true;
  data: {
    event: any;
    stats: {
      total_participantes: number;
      credenciados: number;
      pendentes: number;
      cancelados: number;
      checked_in: number;
      taxa_credenciamento: number;
      taxa_presenca: number;
    };
    participants?: any[];
    charts?: any;
  };
  message: string;
}

interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

type ApiResponse = EventReportSuccess | ApiError;

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
    if (!userRoles.includes('admin') && !userRoles.includes('manager')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Você não tem permissão para acessar relatórios.',
      });
    }
  } catch (authError) {
    console.error('[EventReport] Erro na autenticação:', authError);
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
      message: 'ID do evento é obrigatório.',
    });
  }

  const queryParams = {
    eventId: id,
    includeParticipants: req.query.includeParticipants === 'true',
    includeStats: req.query.includeStats !== 'false', // true por padrão
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const validation = eventReportQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Bad request',
      message: 'Parâmetros inválidos.',
      details: process.env.NODE_ENV === 'development' ? validation.error.issues : undefined,
    });
  }

  const { eventId, includeParticipants, includeStats } = validation.data;

  // --------------------------------------------------------------------------
  // 4. BUSINESS LOGIC
  // --------------------------------------------------------------------------
  try {
    console.log(`[EventReport] Gerando relatório do evento ${eventId}`);

    // Buscar dados do evento
    const event = await supabaseAdminService.getEventById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Evento não encontrado.',
      });
    }

    // Buscar estatísticas
    let stats = null;
    if (includeStats) {
      stats = await supabaseAdminService.getEventStats(eventId);
    }

    // Buscar participantes (se solicitado)
    let participants = null;
    if (includeParticipants) {
      const result = await supabaseAdminService.getParticipants({
        event_id: eventId,
        page: 1,
        limit: 1000, // Buscar todos os participantes
        orderBy: 'nome',
        order: 'asc',
      });
      // Deduplicar por CPF normalizado e propagar fonte
      const byCpf = new Map<string, any>();
      for (const p of result.data) {
        const key = normalizeCPF(p.cpf);
        if (!byCpf.has(key)) {
          byCpf.set(key, { ...p, cpf: key });
        }
      }
      let baseParticipants = Array.from(byCpf.values());

      // Enriquecer com presença no SAS e status UI
      if (event.codevento_sas) {
        try {
          const codEvento = String(event.codevento_sas);
          const sasParticipants = await sasService.fetchParticipants({ codEvento });
          const sasCpfSet = new Set<string>(
            (sasParticipants || []).map((sp: any) => normalizeCPF(sp.cpf))
          );

          baseParticipants = baseParticipants.map((p: any) => {
            const in_sas = sasCpfSet.has(normalizeCPF(p.cpf));
            // status_credenciamento vem como 'credentialed'|'pending'|'cancelled' (mapeado no service)
            const isCredenciado =
              p.status_credenciamento === 'credentialed' ||
              p.status_credenciamento === 'credenciado';
            let ui_status = p.status_credenciamento;
            if (isCredenciado && in_sas) {
              ui_status = 'integrado';
            } else if (isCredenciado && !in_sas) {
              ui_status = 'credenciado/Pendente de sincronização';
            } else if (!isCredenciado && in_sas) {
              ui_status = 'Pendente de Checkin';
            } else {
              // manter tradução padrão do front caso não se aplique
              ui_status = p.status_credenciamento;
            }
            return { ...p, in_sas, ui_status };
          });
        } catch (e) {
          console.warn(
            '[EventReport] Não foi possível consultar participantes no SAS:',
            (e as any)?.message
          );
          baseParticipants = baseParticipants.map((p: any) => ({ ...p, in_sas: false }));
        }
      }

      participants = baseParticipants;
    }

    // Preparar dados de gráficos
    const charts = stats
      ? {
          statusDistribution: [
            { name: 'Credenciados', value: stats.credenciados, color: '#10b981' },
            { name: 'Pendentes', value: stats.pendentes, color: '#f59e0b' },
            { name: 'Cancelados', value: stats.cancelados, color: '#ef4444' },
          ],
          presenceRate: {
            present: stats.checked_in,
            absent: stats.credenciados - stats.checked_in,
            rate: stats.taxa_presenca,
          },
          dailyCheckIns: [], // Adicionar dados de check-ins diários se necessário
          categoryBreakdown: [], // Adicionar breakdown por categoria se necessário
        }
      : null;

    console.log(`[EventReport] ✅ Relatório gerado com sucesso`);

    // --------------------------------------------------------------------------
    // 5. SUCCESS RESPONSE
    // --------------------------------------------------------------------------
    return res.status(200).json({
      success: true,
      data: {
        event,
        stats: stats || {
          total_participantes: 0,
          credenciados: 0,
          pendentes: 0,
          cancelados: 0,
          checked_in: 0,
          taxa_credenciamento: 0,
          taxa_presenca: 0,
        },
        participants: includeParticipants ? participants || [] : undefined,
        charts,
      },
      message: 'Relatório gerado com sucesso.',
    });
  } catch (error: any) {
    // --------------------------------------------------------------------------
    // 6. ERROR HANDLING
    // --------------------------------------------------------------------------
    console.error('[EventReport] Erro ao gerar relatório:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro inesperado ao gerar relatório.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
