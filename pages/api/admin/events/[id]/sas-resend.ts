import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { normalizeCPF } from '@/lib/utils/cpf';
import { supabaseAdminService } from '@/services';

type Success = { success: true; message: string; data?: any };
type Failure = { success: false; message: string; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Success | Failure>
) {
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
    if (!event) {
      return res
        .status(404)
        .json({ success: false, error: 'not_found', message: 'Evento não encontrado' });
    }

    const cpfNorm = normalizeCPF(cpf);
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({
        success: false,
        error: 'missing_config',
        message: 'N8N_WEBHOOK_URL não configurada',
      });
    }

    const payload = {
      action: 'resend_participant',
      event_id: id,
      event_codevento_sas: event.codevento_sas || null,
      participant_cpf: cpfNorm,
      timestamp: new Date().toISOString(),
      source: 'credenciamento-admin',
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    const responseJson = (() => {
      try {
        return JSON.parse(responseBody);
      } catch {
        return { raw: responseBody };
      }
    })();

    if (!response.ok) {
      console.error(
        '[sas-resend] webhook error:',
        response.status,
        response.statusText,
        responseBody
      );
      return res.status(502).json({
        success: false,
        error: 'webhook_error',
        message: 'Falha ao reenviar dados para o n8n',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dados reenviados para o n8n com sucesso',
      data: responseJson,
    });
  } catch (error: any) {
    console.error('[sas-resend] erro:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message || 'Erro ao reenviar dados',
    });
  }
}
