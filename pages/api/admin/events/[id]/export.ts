/**
 * API Endpoint: Export Event Report
 *
 * Exports event report with participants data to Excel or PDF format.
 * Supports data anonymization for privacy compliance.
 *
 * @module pages/api/admin/events/[id]/export
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from '../../../auth';
import { getSupabaseAdmin } from '@/lib/config/supabase';
import { sasService } from '@/services';
import { normalizeCPF } from '@/lib/utils/cpf';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';
import { anonymizeRecords } from '@/lib/export/anonymize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authentication check
  const session = await getServerSession(req, res, authOptions as any);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Não autenticado' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { id: eventId } = req.query;
    const { format = 'excel', anonymize = false, includeParticipants = true } = req.body;

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'ID do evento inválido' });
    }

    console.log(
      `[Export] Exportando evento ${eventId} para ${format}${anonymize ? ' (anonimizado)' : ''}`
    );

    const supabase = getSupabaseAdmin();

    // 1. Buscar dados do evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[Export] Erro ao buscar evento:', eventError);
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }

    // 2. Buscar participantes se solicitado
    let participants: any[] = [];
    if (includeParticipants) {
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select(
          `
          id,
          status,
          data_inscricao,
          check_ins:check_ins!left ( data_check_in ),
          participant:participants (
            id,
            cpf,
            nome,
            email,
            telefone,
            fonte
          )
        `
        )
        .eq('event_id', eventId);

      if (regError) {
        console.error('[Export] Erro ao buscar participantes:', regError);
      } else if (registrations) {
        // Try to determine SAS presence for mapping 'Falta'
        let sasCpfSet = new Set<string>();
        try {
          const eventAny: any = event as any;
          if (eventAny?.codevento_sas) {
            const codEvento = String(eventAny.codevento_sas);
            const sasList = await sasService.fetchParticipants({ codEvento });
            sasCpfSet = new Set<string>((sasList || []).map((sp: any) => normalizeCPF(sp.cpf)));
          }
        } catch (e) {
          console.warn('[Export] Não foi possível consultar SAS para export:', (e as any)?.message);
        }

        const byCpf = new Map<string, any>();
        registrations.forEach((reg: any) => {
          const check_in_at =
            Array.isArray(reg.check_ins) && reg.check_ins.length > 0
              ? reg.check_ins[0].data_check_in
              : null;
          const row = {
            ...reg.participant,
            status: reg.status,
            data_inscricao: reg.data_inscricao,
            check_in_at,
          };
          const cpfKey = normalizeCPF(row.cpf);

          // Determine export status respecting SAS and local presence
          const inSas = sasCpfSet.has(cpfKey);
          const isCheckedIn = !!check_in_at;
          const isConfirmed = reg.status === 'confirmed';
          row.status_export = isCheckedIn
            ? 'checked_in'
            : isConfirmed
              ? 'confirmed'
              : inSas
                ? 'Falta'
                : reg.status;

          if (!byCpf.has(cpfKey)) {
            byCpf.set(cpfKey, row);
          } else {
            const prev = byCpf.get(cpfKey);
            // Prioridade: checked_in > confirmed > others/Falta
            const rank = (s: string) => (s === 'checked_in' ? 3 : s === 'confirmed' ? 2 : 1);
            if (rank(row.status_export) > rank(prev.status_export)) {
              byCpf.set(cpfKey, row);
            } else if (rank(row.status_export) === rank(prev.status_export)) {
              // Se mesma prioridade, preferir com check_in_at mais recente
              const tPrev = prev.check_in_at ? new Date(prev.check_in_at).getTime() : 0;
              const tNew = row.check_in_at ? new Date(row.check_in_at).getTime() : 0;
              if (tNew > tPrev) byCpf.set(cpfKey, row);
            }
          }
        });
        participants = Array.from(byCpf.values());
      }
    }

    // 3. Buscar estatísticas
    const { data: stats } = await supabase
      .from('registrations')
      .select('status')
      .eq('event_id', eventId);

    const statistics = {
      total: stats?.length || 0,
      credenciados: stats?.filter((s: any) => s.status === 'confirmed').length || 0,
      pendentes: stats?.filter((s: any) => s.status === 'registered').length || 0,
      cancelados: stats?.filter((s: any) => s.status === 'cancelled').length || 0,
    };

    // 4. Preparar dados para exportação
    const exportData = {
      event,
      participants,
      statistics,
    };

    // 5. Anonimizar se solicitado
    if (anonymize && participants.length > 0) {
      participants = anonymizeRecords(participants);
    }

    // 6. Gerar arquivo no formato solicitado
    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    const eventName = (event as any).nome || 'evento';

    if (format === 'pdf') {
      // Map status for export: prefer status_export when present
      const pdfRows = participants.map((p: any) => ({
        Nome: p.nome,
        CPF: p.cpf,
        Email: p.email,
        Status: p.status_export || p.status,
        CheckIn: p.check_in_at ? new Date(p.check_in_at).toLocaleString('pt-BR') : '-',
      }));
      buffer = await exportToPDF(pdfRows);
      filename = `evento-${eventName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
      contentType = 'application/pdf';
    } else {
      // Default: Excel, map fields and prefer status_export
      const excelRows = participants.map((p: any) => ({
        Nome: p.nome,
        CPF: p.cpf,
        Email: p.email,
        Status: p.status_export || p.status,
        'Check-in em': p.check_in_at ? new Date(p.check_in_at).toLocaleString('pt-BR') : '-',
      }));
      buffer = await exportToExcel(excelRows, { sheetName: 'Participantes' });
      filename = `evento-${eventName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    console.log(`[Export] ✅ Arquivo gerado: ${filename} (${buffer.length} bytes)`);

    // 7. Enviar arquivo
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error('[Export] Erro ao exportar:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar arquivo de exportação',
      message: error.message,
    });
  }
}
