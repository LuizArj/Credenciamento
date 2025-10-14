import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { normalizeCPF } from '@/lib/utils/cpf';
import { supabaseAdminService, sasService } from '@/services';

type Success = {
  success: true;
  data: {
    found: boolean;
    cpf: string;
    eventCode: string;
    participant?: any;
  };
  message: string;
};

type Failure = {
  success: false;
  error: string;
  message: string;
};

type ApiResponse = Success | Failure;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, error: 'method_not_allowed', message: 'Use POST' });
  }

  // Auth
  try {
    const session = await getServerSession(req, res, authOptions);
    const roles = session?.user?.roles || [];
    if (!session || !(roles.includes('admin') || roles.includes('manager'))) {
      return res
        .status(401)
        .json({ success: false, error: 'unauthorized', message: 'Não autorizado' });
    }
  } catch (e) {
    return res
      .status(401)
      .json({ success: false, error: 'unauthorized', message: 'Falha de autenticação' });
  }

  const { id } = req.query;
  const { cpf } = req.body || {};
  if (!id || typeof id !== 'string') {
    return res
      .status(400)
      .json({ success: false, error: 'bad_request', message: 'event id inválido' });
  }
  if (!cpf || typeof cpf !== 'string') {
    return res
      .status(400)
      .json({ success: false, error: 'bad_request', message: 'cpf é obrigatório' });
  }

  try {
    const event = await supabaseAdminService.getEventById(id);
    if (!event?.codevento_sas) {
      return res
        .status(400)
        .json({ success: false, error: 'invalid_event', message: 'Evento não possui código SAS' });
    }

    const codEvento = String(event.codevento_sas);
    const participants = await sasService.fetchParticipants({ codEvento });
    const cpfNorm = normalizeCPF(cpf);
    const found = participants.find((p: any) => normalizeCPF(p.cpf) === cpfNorm);

    return res.status(200).json({
      success: true,
      data: {
        found: !!found,
        cpf: cpfNorm,
        eventCode: codEvento,
        participant: found || undefined,
      },
      message: found ? 'Participante encontrado no SAS' : 'Participante não encontrado no SAS',
    });
  } catch (error: any) {
    console.error('[sas-verify] erro:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message || 'Erro ao verificar no SAS',
    });
  }
}
