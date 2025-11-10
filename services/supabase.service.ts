/**
 * Supabase Service
 *
 * @description Serviço centralizado para operações no Supabase
 * @version 1.0.0
 */

import { query, withTransaction } from '@/lib/config/database';
import type { Event, EventFilter, Participant, ParticipantFilter } from '@/schemas';

// ============================================================================
// TYPES
// ============================================================================

interface PaginationResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface EventStats {
  total_participantes: number;
  credenciados: number;
  pendentes: number;
  cancelados: number;
  checked_in: number;
  taxa_credenciamento: number;
  taxa_presenca: number;
}

interface ParticipantHistory {
  event_id: string;
  event_nome: string;
  event_data_inicio: string;
  status_credenciamento: string;
  credenciado_em: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}

// ============================================================================
// SUPABASE SERVICE CLASS
// ============================================================================

export class SupabaseService {
  constructor() {}
  // Note: This service now uses direct SQL via query() and withTransaction()

  // ==========================================================================
  // EVENT OPERATIONS
  // ==========================================================================

  /**
   * Busca eventos com filtros e paginação
   */
  async getEvents(filters: EventFilter): Promise<PaginationResult<Event>> {
    const {
      search,
      status,
      modalidade,
      data_inicio,
      data_fim,
      page = 1,
      limit = 10,
      orderBy = 'data_inicio',
      order = 'desc',
    } = filters;

    // Build dynamic WHERE clauses
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      whereClauses.push(`(nome ILIKE $${params.length - 2} OR local ILIKE $${params.length - 1} OR descricao ILIKE $${params.length})`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`status = $${params.length}`);
    }

    if (modalidade && modalidade !== 'all') {
      params.push(modalidade);
      whereClauses.push(`modalidade = $${params.length}`);
    }

    if (data_inicio) {
      params.push(data_inicio);
      whereClauses.push(`data_inicio >= $${params.length}`);
    }

    if (data_fim) {
      params.push(data_fim);
      whereClauses.push(`data_fim <= $${params.length}`);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count
    const countRes = await query(`SELECT COUNT(*) AS count FROM events ${where}`, params);
    const count = parseInt(countRes.rows[0]?.count || '0', 10);

    // Ordering and pagination
    const offset = (page - 1) * limit;
    const orderDir = order === 'asc' ? 'ASC' : 'DESC';
    const orderBySafe = ['data_inicio', 'created_at', 'nome'].includes(orderBy) ? orderBy : 'data_inicio';

    const selectRes = await query(
      `SELECT * FROM events ${where} ORDER BY ${orderBySafe} ${orderDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(count / limit);

    return {
      data: selectRes.rows || [],
      count,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Busca evento por ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    const res = await query('SELECT * FROM events WHERE id = $1 LIMIT 1', [eventId]);
    return res.rows[0] || null;
  }

  /**
   * Busca estatísticas de um evento
   */
  async getEventStats(eventId: string): Promise<EventStats> {
    const res = await query(
      `SELECT
        COUNT(*) FILTER (WHERE true) AS total,
        COUNT(*) FILTER (WHERE status = 'confirmed') AS credenciados,
        COUNT(*) FILTER (WHERE status = 'registered') AS pendentes,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelados
      FROM registrations WHERE event_id = $1`,
      [eventId]
    );

    const row = res.rows[0] || { total: 0, credenciados: 0, pendentes: 0, cancelados: 0 };
    const total = parseInt(row.total || '0', 10);
    const credenciados = parseInt(row.credenciados || '0', 10);
    const pendentes = parseInt(row.pendentes || '0', 10);
    const cancelados = parseInt(row.cancelados || '0', 10);

    // checked_in via check_ins
    const checkRes = await query(`SELECT COUNT(DISTINCT registration_id) AS checked FROM check_ins WHERE event_id = $1`, [eventId]);
    const checked_in = parseInt(checkRes.rows[0]?.checked || '0', 10);

    return {
      total_participantes: total,
      credenciados,
      pendentes,
      cancelados,
      checked_in,
      taxa_credenciamento: total > 0 ? (credenciados / total) * 100 : 0,
      taxa_presenca: credenciados > 0 ? (checked_in / credenciados) * 100 : 0,
    };
  }

  /**
   * Cria novo evento
   */
  async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const fields = Object.keys(eventData);
    const cols = fields.join(', ');
    const params = fields.map((_, i) => `$${i + 1}`);
    const values = Object.values(eventData);
    // add timestamps
    values.push(new Date().toISOString());
    values.push(new Date().toISOString());

    const res = await query(
      `INSERT INTO events (${cols}, created_at, updated_at) VALUES (${params.join(', ')}, $${values.length - 1}, $${values.length}) RETURNING *`,
      values
    );
    return res.rows[0];
  }

  /**
   * Atualiza evento
   */
  async updateEvent(eventId: string, eventData: Partial<Event>): Promise<Event> {
    const fields = Object.keys(eventData || {});
    if (fields.length === 0) {
      const res = await query('SELECT * FROM events WHERE id = $1 LIMIT 1', [eventId]);
      return res.rows[0];
    }

    const sets = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = Object.values(eventData || {});
    // push updated_at
    values.push(new Date().toISOString());
    const setClause = `${sets.join(', ')}, updated_at = $${values.length}`;

    const res = await query(`UPDATE events SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`, [...values, eventId]);
    return res.rows[0];
  }

  /**
   * Deleta evento
   */
  async deleteEvent(eventId: string): Promise<void> {
    await query('DELETE FROM events WHERE id = $1', [eventId]);
  }

  // ==========================================================================
  // PARTICIPANT OPERATIONS
  // ==========================================================================

  /**
   * Busca participantes com filtros e paginação
   */
  async getParticipants(filters: ParticipantFilter): Promise<PaginationResult<Participant>> {
    const {
      search,
      event_id,
      status_credenciamento,
      source,
      checked_in,
      page = 1,
      limit = 10,
      orderBy = 'created_at',
      order = 'desc',
    } = filters;

    // Se estiver filtrando por event_id, precisamos usar JOIN com registrations
    if (event_id) {
      const params: any[] = [event_id];
      const where: string[] = [`r.event_id = $1`];

      if (search) {
        params.push(`%${search}%`);
        const idx = params.length;
        where.push(`(p.nome ILIKE $${idx} OR p.email ILIKE $${idx} OR p.cpf ILIKE $${idx})`);
      }

      if (status_credenciamento && status_credenciamento !== 'all') {
        const statusMap: Record<string, string> = {
          credentialed: 'confirmed',
          pending: 'registered',
          cancelled: 'cancelled',
        };
        params.push(statusMap[status_credenciamento] || status_credenciamento);
        where.push(`r.status = $${params.length}`);
      }

      if (source && source !== 'all') {
        params.push(source);
        where.push(`p.fonte = $${params.length}`);
      }

      const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

      // Count
      const countRes = await query(`SELECT COUNT(*) AS count FROM registrations r JOIN participants p ON p.id = r.participant_id ${whereClause}`, params);
      const count = parseInt(countRes.rows[0]?.count || '0', 10);

      const offset = (page - 1) * limit;

      const selectRes = await query(
        `SELECT p.*, r.status AS registration_status FROM registrations r JOIN participants p ON p.id = r.participant_id ${whereClause} ORDER BY p.${orderBy} ${order === 'asc' ? 'ASC' : 'DESC'} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const participants = (selectRes.rows || []).map((row: any) => ({
        ...row,
        status_credenciamento:
          row.registration_status === 'confirmed'
            ? 'credentialed'
            : row.registration_status === 'registered'
            ? 'pending'
            : row.registration_status === 'cancelled'
            ? 'cancelled'
            : row.registration_status,
        checked_in: false,
      }));

      const totalPages = Math.ceil(count / limit);

      return {
        data: participants,
        count,
        page,
        limit,
        totalPages,
      };
    }

    // Query sem filtro de event_id (busca direta em participants)
    const params: any[] = [];
    const where: string[] = [];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      where.push(`(nome ILIKE $${idx} OR email ILIKE $${idx} OR cpf ILIKE $${idx})`);
    }

    if (source && source !== 'all') {
      params.push(source);
      where.push(`fonte = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) AS count FROM participants ${whereClause}`, params);
    const count = parseInt(countRes.rows[0]?.count || '0', 10);

    const offset = (page - 1) * limit;

    const selectRes = await query(
      `SELECT * FROM participants ${whereClause} ORDER BY ${orderBy} ${order === 'asc' ? 'ASC' : 'DESC'} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const participantsWithStatus = (selectRes.rows || []).map((p: any) => ({
      ...p,
      status_credenciamento: 'pending',
      checked_in_at: null,
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      data: participantsWithStatus,
      count,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Busca participante por ID
   */
  async getParticipantById(participantId: string): Promise<Participant | null> {
    const res = await query('SELECT * FROM participants WHERE id = $1 LIMIT 1', [participantId]);
    return res.rows[0] || null;
  }

  /**
   * Busca histórico de participação de um participante
   */
  async getParticipantHistory(participantCpf: string): Promise<ParticipantHistory[]> {
    // Buscar pelo CPF do participante -> pegar id, depois buscar registrations + evento
    const pRes = await query('SELECT id, cpf FROM participants WHERE cpf = $1 LIMIT 1', [participantCpf]);
    const p = pRes.rows[0];
    if (!p) throw new Error('Participante não encontrado pelo CPF');

    const res = await query(
      `SELECT r.event_id, r.status, r.data_inscricao, r.updated_at, e.nome AS event_nome, e.data_inicio AS event_data_inicio,
        ci.data_check_in
      FROM registrations r
      LEFT JOIN events e ON e.id = r.event_id
      LEFT JOIN check_ins ci ON ci.registration_id = r.id
      WHERE r.participant_id = $1
      ORDER BY r.data_inscricao DESC`,
      [p.id]
    );

    // Group by event_id and take first check_in per registration
    return (res.rows || []).map((item: any) => ({
      event_id: item.event_id,
      event_nome: item.event_nome || 'Evento não encontrado',
      event_data_inicio: item.event_data_inicio || '',
      status_credenciamento: item.status === 'confirmed' ? 'credentialed' : item.status,
      credenciado_em: item.data_inscricao || null,
      checked_in: !!item.data_check_in,
      checked_in_at: item.data_check_in || null,
    }));
  }

  /**
   * Cria novo participante
   */
  async createParticipant(
    participantData: Omit<Participant, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Participant> {
    const fields = Object.keys(participantData);
    const cols = fields.join(', ');
    const params = fields.map((_, i) => `$${i + 1}`);
    const values = Object.values(participantData);
    values.push(new Date().toISOString());
    values.push(new Date().toISOString());

    const res = await query(
      `INSERT INTO participants (${cols}, created_at, updated_at) VALUES (${params.join(', ')}, $${values.length - 1}, $${values.length}) RETURNING *`,
      values
    );

    return res.rows[0];
  }

  /**
   * Atualiza participante
   */
  async updateParticipant(
    participantId: string,
    participantData: Partial<Participant>
  ): Promise<Participant> {
    const fields = Object.keys(participantData || {});
    if (fields.length === 0) {
      const res = await query('SELECT * FROM participants WHERE id = $1 LIMIT 1', [participantId]);
      return res.rows[0];
    }

    const sets = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = Object.values(participantData || {});
    values.push(new Date().toISOString());
    const setClause = `${sets.join(', ')}, updated_at = $${values.length}`;

    const res = await query(`UPDATE participants SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`, [...values, participantId]);
    return res.rows[0];
  }

  /**
   * Deleta participante
   */
  async deleteParticipant(participantId: string): Promise<void> {
    await query('DELETE FROM participants WHERE id = $1', [participantId]);
  }

  /**
   * Credencia participante
   */
  async credenciarParticipant(participantId: string, credenciadoPor: string): Promise<Participant> {
    return this.updateParticipant(participantId, {
      status_credenciamento: 'credentialed',
      credenciado_em: new Date().toISOString(),
      credenciado_por: credenciadoPor,
    });
  }

  /**
   * Faz check-in de participante
   */
  async checkInParticipant(participantId: string): Promise<Participant> {
    return this.updateParticipant(participantId, {
      checked_in: true,
      checked_in_at: new Date().toISOString(),
    });
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const supabaseService = new SupabaseService(); // compatibility: public instance
export const supabaseAdminService = new SupabaseService(); // compatibility: admin instance (same behavior)
