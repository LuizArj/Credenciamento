/**
 * API: Sync Event with SAS
 * POST /api/admin/events/[id]/sync-sas
 *
 * Sincroniza um evento com o sistema SAS, puxando os participantes atualizados
 * @requires Admin authentication
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { SASService } from '@/services/sas.service';
import { query } from '@/lib/config/database';

export default async function handler(req, res) {
  // 1. Validate method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
    });
  }

  // 2. Validate authentication
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Admin access required.',
    });
  }

  // 3. Extract parameters
  const { id: eventId } = req.query;
  const { codEvento, overwrite = true, includeParticipants = true } = req.body;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required in URL path.',
    });
  }

  if (!codEvento) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: codEvento (SAS event code).',
    });
  }

  console.log(`[SYNC_SAS] Starting sync for event ${eventId} (SAS code: ${codEvento})`);
  console.log(
    `[SYNC_SAS] Options: overwrite=${overwrite}, includeParticipants=${includeParticipants}`
  );

  try {
    // 4. Verify event exists in local database
    const eventResult = await query(
      'SELECT id, nome, codevento_sas FROM events WHERE id = $1 OR codevento_sas = $2 LIMIT 1',
      [eventId, codEvento]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Event not found with ID ${eventId} or SAS code ${codEvento}.`,
      });
    }

    const localEvent = eventResult.rows[0];
    console.log(`[SYNC_SAS] Local event found: ${localEvent.nome} (${localEvent.id})`);

    // 5. Initialize SAS service
    const sasService = new SASService();

    // 6. Fetch participants from SAS
    console.log(`[SYNC_SAS] Fetching participants from SAS...`);
    const sasParticipants = await sasService.fetchParticipants({
      codEvento: codEvento,
    });

    console.log(`[SYNC_SAS] Found ${sasParticipants.length} participants in SAS`);

    if (sasParticipants.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No participants found in SAS for this event.',
        stats: {
          found: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
        },
      });
    }

    // 7. Sync participants to local database (if requested)
    let syncStats = { inserted: 0, updated: 0, skipped: 0 };

    if (includeParticipants) {
      console.log(`[SYNC_SAS] Syncing ${sasParticipants.length} participants to database...`);
      console.log(`[SYNC_SAS] Target event ID: ${localEvent.id}`);
      console.log(`[SYNC_SAS] Overwrite mode: ${overwrite}`);

      syncStats = await sasService.syncParticipantsToSupabase({
        eventId: localEvent.id,
        participants: sasParticipants,
        overwrite: overwrite,
      });

      console.log(`[SYNC_SAS] Sync completed:`, syncStats);
      console.log(
        `[SYNC_SAS] Details: ${syncStats.inserted} new registrations, ${syncStats.updated} updated, ${syncStats.skipped} skipped`
      );
    }

    // 8. Return success response
    return res.status(200).json({
      success: true,
      message: `Successfully synced ${sasParticipants.length} participants from SAS.`,
      stats: {
        found: sasParticipants.length,
        inserted: syncStats.inserted,
        updated: syncStats.updated,
        skipped: syncStats.skipped,
      },
      event: {
        id: localEvent.id,
        nome: localEvent.nome,
        codevento_sas: localEvent.codevento_sas,
      },
    });
  } catch (error) {
    console.error('[SYNC_SAS] Error during sync:', error);

    // Handle specific error cases
    if (error.message.includes('SAS')) {
      return res.status(502).json({
        success: false,
        message: 'Error communicating with SAS API.',
        error: error.message,
        hint: 'Verify SAS API credentials and network connectivity.',
      });
    }

    if (error.message.includes('database') || error.code) {
      return res.status(500).json({
        success: false,
        message: 'Database error during sync.',
        error: error.message,
        hint: 'Check database logs for details.',
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Internal server error during sync.',
      error: error.message,
    });
  }
}
