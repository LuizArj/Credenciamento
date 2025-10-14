import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/config/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Não autenticado' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'ID do participante inválido' });
  }

  const supabase = getSupabaseAdmin() as any;
  try {
    // Obter última inscrição do participante (mais recente)
    const { data: regs, error: regErr } = await supabase
      .from('registrations')
      .select('id, event_id, participant_id, status, data_inscricao')
      .eq('participant_id', id)
      .order('data_inscricao', { ascending: false })
      .limit(1);
    if (regErr) throw new Error(regErr.message);
    const reg = regs?.[0];
    if (!reg) {
      return res
        .status(404)
        .json({ success: false, error: 'Nenhuma inscrição encontrada para este participante' });
    }

    // Atualizar status para confirmed se ainda registered/cancelled
    if (reg.status !== 'confirmed') {
      const { error: upErr } = await supabase
        .from('registrations')
        .update({ status: 'confirmed' })
        .eq('id', reg.id);
      if (upErr) throw new Error(upErr.message);
    }

    // Criar check-in imediatamente conforme regra solicitada
    const { data: check, error: checkErr } = await supabase
      .from('check_ins')
      .insert({
        registration_id: reg.id,
        responsavel_credenciamento: session.user?.name || 'sistema',
      })
      .select('*')
      .single();
    if (checkErr) throw new Error(checkErr.message);

    // Não alterar status para 'checked_in'; presença fica registrada em check_ins

    return res.status(200).json({
      success: true,
      data: { registration_id: reg.id, check_in_at: check?.data_check_in || null },
      message: 'Participante credenciado e check-in realizado.',
    });
  } catch (e: any) {
    console.error('[Credenciar] Erro:', e);
    return res
      .status(500)
      .json({ success: false, error: 'Erro ao credenciar/check-in', message: e.message });
  }
}
