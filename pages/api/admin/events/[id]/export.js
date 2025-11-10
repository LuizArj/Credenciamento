/**
 * API: Export Event Report
 * POST /api/admin/events/[id]/export
 *
 * Exports event report to Excel or PDF format
 */

import { query } from '@/lib/config/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTableLib from 'jspdf-autotable';

// jspdf-autotable precisa ser chamado como função, não como método
const autoTable = autoTableLib.default || autoTableLib;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Authentication check
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id: eventId } = req.query;
    const {
      format = 'excel',
      anonymize = false,
      includeParticipants = true,
      includeStats = true,
    } = req.body;

    console.log('[EXPORT] Request:', {
      eventId,
      format,
      anonymize,
      includeParticipants,
      includeStats,
    });

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    // Fetch event details
    const eventResult = await query({
      text: `SELECT * FROM events WHERE id = $1`,
      values: [eventId],
    });

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Fetch statistics
    let stats = {};
    if (includeStats) {
      const statsResult = await query({
        text: `
          SELECT 
            COUNT(DISTINCT r.id) as total_participants,
            COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END) as credenciados,
            COUNT(DISTINCT CASE WHEN r.status = 'checked_in' THEN r.id END) as checked_in,
            COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pendentes,
            COUNT(DISTINCT CASE WHEN r.status = 'cancelled' THEN r.id END) as cancelados,
            COUNT(DISTINCT ci.id) as total_checkins
          FROM registrations r
          LEFT JOIN check_ins ci ON ci.registration_id = r.id
          WHERE r.event_id = $1
        `,
        values: [eventId],
      });

      stats = statsResult.rows[0];
    }

    // Fetch participants
    let participants = [];
    if (includeParticipants) {
      const participantsResult = await query({
        text: `
          SELECT 
            p.id,
            p.nome,
            p.cpf,
            p.email,
            p.telefone,
            p.fonte,
            r.status as status_credenciamento,
            ci.data_check_in,
            TO_CHAR(r.created_at, 'DD/MM/YYYY HH24:MI:SS') as data_inscricao
          FROM registrations r
          JOIN participants p ON p.id = r.participant_id
          LEFT JOIN check_ins ci ON ci.registration_id = r.id
          WHERE r.event_id = $1
          ORDER BY r.created_at DESC
        `,
        values: [eventId],
      });

      participants = participantsResult.rows;
    }

    // Generate Excel (only format supported for now)
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Event Overview
      const overviewSheet = workbook.addWorksheet('Visão Geral');

      // Event info section
      overviewSheet.addRow(['RELATÓRIO DO EVENTO']);
      overviewSheet.addRow([]);
      overviewSheet.addRow(['Nome do Evento', event.nome]);
      overviewSheet.addRow(['Código SAS', event.codevento_sas || 'N/A']);
      overviewSheet.addRow([
        'Data Início',
        event.data_inicio ? new Date(event.data_inicio).toLocaleDateString('pt-BR') : 'N/A',
      ]);
      overviewSheet.addRow([
        'Data Fim',
        event.data_fim ? new Date(event.data_fim).toLocaleDateString('pt-BR') : 'N/A',
      ]);
      overviewSheet.addRow(['Local', event.local || 'N/A']);
      overviewSheet.addRow(['Cidade', event.cidade || 'N/A']);
      overviewSheet.addRow(['Status', event.status]);
      overviewSheet.addRow([]);

      // Statistics section
      if (includeStats && stats) {
        overviewSheet.addRow(['ESTATÍSTICAS']);
        overviewSheet.addRow([]);
        overviewSheet.addRow(['Total de Participantes', parseInt(stats.total_participants) || 0]);
        overviewSheet.addRow(['Credenciados', parseInt(stats.checked_in) || 0]);
        overviewSheet.addRow(['Confirmados', parseInt(stats.credenciados) || 0]);
        overviewSheet.addRow(['Pendentes', parseInt(stats.pendentes) || 0]);
        overviewSheet.addRow(['Cancelados', parseInt(stats.cancelados) || 0]);
        overviewSheet.addRow(['Total de Check-ins', parseInt(stats.total_checkins) || 0]);
      }

      // Style the overview sheet
      overviewSheet.getColumn(1).width = 30;
      overviewSheet.getColumn(2).width = 50;
      overviewSheet.getRow(1).font = { bold: true, size: 14 };

      // Sheet 2: Participants
      if (includeParticipants && participants.length > 0) {
        const participantsSheet = workbook.addWorksheet('Participantes');

        // Header row
        const headers = [
          'Nome',
          'CPF',
          'Email',
          'Telefone',
          'Fonte',
          'Status',
          'Data Check-in',
          'Data Inscrição',
        ];
        participantsSheet.addRow(headers);

        // Style header
        const headerRow = participantsSheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Data rows
        participants.forEach((p) => {
          const row = [
            anonymize ? maskName(p.nome) : p.nome,
            anonymize ? maskCPF(p.cpf) : formatCPF(p.cpf),
            anonymize ? maskEmail(p.email) : p.email,
            anonymize ? maskPhone(p.telefone) : p.telefone,
            p.fonte || 'N/A',
            translateStatus(p.status_credenciamento),
            p.data_check_in ? new Date(p.data_check_in).toLocaleString('pt-BR') : 'Não credenciado',
            p.data_inscricao || 'N/A',
          ];
          participantsSheet.addRow(row);
        });

        // Auto-fit columns
        participantsSheet.columns.forEach((column) => {
          column.width = 20;
        });
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set headers and send
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="evento-${event.codevento_sas || eventId}-${Date.now()}.xlsx"`
      );

      return res.send(buffer);
    } else if (format === 'pdf') {
      console.log('[EXPORT] Generating PDF report...');

      // Generate PDF report
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DO EVENTO', 105, yPosition, { align: 'center' });
      yPosition += 15;

      // Event Details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const eventDetails = [
        ['Nome do Evento:', event.nome || 'N/A'],
        ['Código SAS:', event.codevento_sas || 'N/A'],
        [
          'Data Início:',
          event.data_inicio ? new Date(event.data_inicio).toLocaleDateString('pt-BR') : 'N/A',
        ],
        [
          'Data Fim:',
          event.data_fim ? new Date(event.data_fim).toLocaleDateString('pt-BR') : 'N/A',
        ],
        ['Local:', event.local || 'N/A'],
        ['Cidade:', event.cidade || 'N/A'],
        ['Status:', event.status || 'N/A'],
      ];

      eventDetails.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 70, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Statistics
      if (includeStats && stats) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ESTATÍSTICAS', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        const statsData = [
          ['Total de Participantes:', parseInt(stats.total_participants) || 0],
          ['Credenciados:', parseInt(stats.checked_in) || 0],
          ['Confirmados:', parseInt(stats.credenciados) || 0],
          ['Pendentes:', parseInt(stats.pendentes) || 0],
          ['Cancelados:', parseInt(stats.cancelados) || 0],
          ['Total de Check-ins:', parseInt(stats.total_checkins) || 0],
        ];

        statsData.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label, 20, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.text(String(value), 90, yPosition);
          yPosition += 7;
        });

        yPosition += 10;
      }

      // Participants Table
      if (includeParticipants && participants.length > 0) {
        console.log('[EXPORT] Adding participants table...');
        // Add new page if needed
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('LISTA DE PARTICIPANTES', 20, yPosition);
        yPosition += 10;

        const tableData = participants.map((p) => [
          anonymize ? maskName(p.nome) : p.nome,
          anonymize ? maskCPF(p.cpf) : formatCPF(p.cpf),
          anonymize ? maskEmail(p.email) : p.email || 'N/A',
          p.fonte || 'N/A',
          translateStatus(p.status_credenciamento),
          p.data_check_in
            ? new Date(p.data_check_in).toLocaleDateString('pt-BR')
            : 'Não credenciado',
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Nome', 'CPF', 'Email', 'Fonte', 'Status', 'Check-in']],
          body: tableData,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [68, 114, 196],
            textColor: 255,
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 30 },
            2: { cellWidth: 45 },
            3: { cellWidth: 20 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
          },
          margin: { left: 10, right: 10 },
        });

        console.log('[EXPORT] Participants table added successfully');
      }

      console.log('[EXPORT] Generating PDF buffer...');
      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      console.log('[EXPORT] PDF buffer generated, size:', pdfBuffer.length);

      // Set headers and send
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="evento-${event.codevento_sas || eventId}-${Date.now()}.pdf"`
      );

      console.log('[EXPORT] Sending PDF response...');
      return res.send(pdfBuffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use "excel" or "pdf".',
      });
    }
  } catch (error) {
    console.error('[EXPORT] Error exporting event report:', error);
    console.error('[EXPORT] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to export event report',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

// Helper functions
function formatCPF(cpf) {
  if (!cpf) return 'N/A';
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function maskCPF(cpf) {
  if (!cpf) return 'N/A';
  const formatted = formatCPF(cpf);
  return formatted.replace(/\d(?=\d{4})/g, '*');
}

function maskName(name) {
  if (!name) return 'N/A';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0) + '***';
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '***';
}

function maskEmail(email) {
  if (!email) return 'N/A';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return user.charAt(0) + '***@' + domain;
}

function maskPhone(phone) {
  if (!phone) return 'N/A';
  return phone.replace(/\d(?=\d{4})/g, '*');
}

function translateStatus(status) {
  const translations = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    checked_in: 'Credenciado',
    cancelled: 'Cancelado',
    waiting_list: 'Lista de Espera',
  };
  return translations[status] || status;
}
