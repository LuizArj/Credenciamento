/**
 * DEBUG API - Verificar registrations após sync SAS
 * GET /api/debug-registrations?eventId=XXX
 */

import { query } from '@/lib/config/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ message: 'eventId is required' });
  }

  try {
    // 1. Verificar evento existe
    const eventResult = await query('SELECT id, nome, codevento_sas FROM events WHERE id = $1', [
      eventId,
    ]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // 2. Contar participantes SAS no sistema
    const sasParticipantsResult = await query(
      "SELECT COUNT(*) as count FROM participants WHERE fonte = 'sas'"
    );

    // 3. Contar registrations no evento
    const registrationsResult = await query(
      'SELECT COUNT(*) as count FROM registrations WHERE event_id = $1',
      [eventId]
    );

    // 4. Contar registrations de participantes SAS neste evento
    const sasRegistrationsResult = await query(
      `SELECT COUNT(*) as count 
       FROM registrations r 
       JOIN participants p ON p.id = r.participant_id 
       WHERE r.event_id = $1 AND p.fonte = 'sas'`,
      [eventId]
    );

    // 5. Listar últimas 10 registrations criadas neste evento
    const recentRegistrationsResult = await query(
      `SELECT 
        r.id as registration_id,
        r.created_at,
        r.status,
        p.nome,
        p.cpf,
        p.fonte
       FROM registrations r
       JOIN participants p ON p.id = r.participant_id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [eventId]
    );

    // 6. Participantes SAS SEM registration neste evento
    const orphanParticipantsResult = await query(
      `SELECT 
        p.id,
        p.nome,
        p.cpf,
        p.created_at
       FROM participants p
       WHERE p.fonte = 'sas'
         AND NOT EXISTS (
           SELECT 1 FROM registrations r 
           WHERE r.participant_id = p.id 
             AND r.event_id = $1
         )
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      event: {
        id: event.id,
        nome: event.nome,
        codevento_sas: event.codevento_sas,
      },
      counts: {
        total_sas_participants_in_system: parseInt(sasParticipantsResult.rows[0].count),
        total_registrations_in_event: parseInt(registrationsResult.rows[0].count),
        sas_registrations_in_event: parseInt(sasRegistrationsResult.rows[0].count),
        orphan_sas_participants: orphanParticipantsResult.rows.length,
      },
      recent_registrations: recentRegistrationsResult.rows,
      orphan_participants: orphanParticipantsResult.rows,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }
}
