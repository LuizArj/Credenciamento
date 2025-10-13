/**
 * API Route: Sync Event from SAS
 * 
 * @route POST /api/admin/events/[id]/sync-sas
 * @description Sincroniza dados de um evento do SAS para o Supabase
 * @auth Requer autenticação admin
 * @version 1.0.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { z } from 'zod';
import { sasService } from '@/services';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

const syncRequestSchema = z.object({
  codEvento: z.string().min(1, 'Código do evento é obrigatório'),
  overwrite: z.boolean().default(false),
  includeParticipants: z.boolean().default(true),
});

interface SyncSuccess {
  success: true;
  data: {
    eventId: string;
    event: any;
    syncResult?: {
      inserted: number;
      updated: number;
      skipped: number;
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

type ApiResponse = SyncSuccess | ApiError;

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
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Método ${req.method} não é suportado. Use POST.`,
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
    if (!userRoles.includes('admin') && !userRoles.includes('manager')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Você não tem permissão para sincronizar eventos.',
      });
    }
  } catch (authError) {
    console.error('[SyncSAS] Erro na autenticação:', authError);
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      message: 'Erro ao validar autenticação.',
    });
  }

  // --------------------------------------------------------------------------
  // 3. REQUEST VALIDATION
  // --------------------------------------------------------------------------
  const validation = syncRequestSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Bad request',
      message: 'Dados inválidos na requisição.',
      details: process.env.NODE_ENV === 'development' ? validation.error.issues : undefined,
    });
  }

  const { codEvento, overwrite, includeParticipants } = validation.data;

  // --------------------------------------------------------------------------
  // 4. BUSINESS LOGIC
  // --------------------------------------------------------------------------
  try {
    console.log(`[SyncSAS] Iniciando sincronização do evento ${codEvento}`);

    if (includeParticipants) {
      // Sincronização completa (evento + participantes)
      const result = await sasService.syncCompleteEvent(codEvento, overwrite);

      console.log(`[SyncSAS] ✅ Sincronização completa finalizada`);

      return res.status(200).json({
        success: true,
        data: {
          eventId: result.eventId,
          event: result.event,
          syncResult: result.syncResult,
        },
        message: `Evento sincronizado com sucesso. ${result.syncResult.inserted} participantes inseridos, ${result.syncResult.updated} atualizados.`,
      });
    } else {
      // Apenas sincronizar dados do evento
      const eventData = await sasService.fetchEvent({ codEvento });
      const eventId = await sasService.syncEventToSupabase({ eventData, overwrite });

      console.log(`[SyncSAS] ✅ Evento sincronizado (sem participantes)`);

      return res.status(200).json({
        success: true,
        data: {
          eventId,
          event: eventData,
        },
        message: 'Evento sincronizado com sucesso.',
      });
    }

  } catch (error: any) {
    // --------------------------------------------------------------------------
    // 6. ERROR HANDLING
    // --------------------------------------------------------------------------
    console.error('[SyncSAS] Erro ao sincronizar:', error);

    // Erros específicos do SAS
    if (error.message?.includes('não encontrado')) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro inesperado ao sincronizar evento.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
