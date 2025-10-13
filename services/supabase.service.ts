/**
 * Supabase Service
 * 
 * @description Serviço centralizado para operações no Supabase
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Event,
  EventFilter,
  Participant,
  ParticipantFilter,
} from '@/schemas';

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
  private client: SupabaseClient;

  constructor(useServiceRole: boolean = false) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = useServiceRole
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    this.client = createClient(url, key);
  }

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

    let query = this.client
      .from('events')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`nome.ilike.%${search}%,local.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (modalidade && modalidade !== 'all') {
      query = query.eq('modalidade', modalidade);
    }

    if (data_inicio) {
      query = query.gte('data_inicio', data_inicio);
    }

    if (data_fim) {
      query = query.lte('data_fim', data_fim);
    }

    // Ordenação
    query = query.order(orderBy, { ascending: order === 'asc' });

    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar eventos: ${error.message}`);
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Busca evento por ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar evento: ${error.message}`);
    }

    return data;
  }

  /**
   * Busca estatísticas de um evento
   */
  async getEventStats(eventId: string): Promise<EventStats> {
    const { data: participants, error } = await this.client
      .from('participants')
      .select('status_credenciamento, checked_in')
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const total = participants?.length || 0;
    const credenciados = participants?.filter(p => p.status_credenciamento === 'credentialed').length || 0;
    const pendentes = participants?.filter(p => p.status_credenciamento === 'pending').length || 0;
    const cancelados = participants?.filter(p => p.status_credenciamento === 'cancelled').length || 0;
    const checked_in = participants?.filter(p => p.checked_in).length || 0;

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
    const { data, error } = await this.client
      .from('events')
      .insert({
        ...eventData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar evento: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza evento
   */
  async updateEvent(eventId: string, eventData: Partial<Event>): Promise<Event> {
    const { data, error } = await this.client
      .from('events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar evento: ${error.message}`);
    }

    return data;
  }

  /**
   * Deleta evento
   */
  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await this.client
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      throw new Error(`Erro ao deletar evento: ${error.message}`);
    }
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

    let query = this.client
      .from('participants')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%,empresa.ilike.%${search}%`
      );
    }

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    if (status_credenciamento && status_credenciamento !== 'all') {
      query = query.eq('status_credenciamento', status_credenciamento);
    }

    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (checked_in !== undefined) {
      query = query.eq('checked_in', checked_in);
    }

    // Ordenação
    query = query.order(orderBy, { ascending: order === 'asc' });

    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar participantes: ${error.message}`);
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Busca participante por ID
   */
  async getParticipantById(participantId: string): Promise<Participant | null> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar participante: ${error.message}`);
    }

    return data;
  }

  /**
   * Busca histórico de participação de um participante
   */
  async getParticipantHistory(participantCpf: string): Promise<ParticipantHistory[]> {
    const { data, error } = await this.client
      .from('participants')
      .select(`
        event_id,
        status_credenciamento,
        credenciado_em,
        checked_in,
        checked_in_at,
        events:event_id (
          nome,
          data_inicio
        )
      `)
      .eq('cpf', participantCpf)
      .order('credenciado_em', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      event_id: item.event_id,
      event_nome: item.events?.nome || 'Evento não encontrado',
      event_data_inicio: item.events?.data_inicio || '',
      status_credenciamento: item.status_credenciamento,
      credenciado_em: item.credenciado_em,
      checked_in: item.checked_in,
      checked_in_at: item.checked_in_at,
    }));
  }

  /**
   * Cria novo participante
   */
  async createParticipant(
    participantData: Omit<Participant, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Participant> {
    const { data, error } = await this.client
      .from('participants')
      .insert({
        ...participantData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar participante: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza participante
   */
  async updateParticipant(
    participantId: string,
    participantData: Partial<Participant>
  ): Promise<Participant> {
    const { data, error } = await this.client
      .from('participants')
      .update({
        ...participantData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', participantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar participante: ${error.message}`);
    }

    return data;
  }

  /**
   * Deleta participante
   */
  async deleteParticipant(participantId: string): Promise<void> {
    const { error } = await this.client
      .from('participants')
      .delete()
      .eq('id', participantId);

    if (error) {
      throw new Error(`Erro ao deletar participante: ${error.message}`);
    }
  }

  /**
   * Credencia participante
   */
  async credenciarParticipant(
    participantId: string,
    credenciadoPor: string
  ): Promise<Participant> {
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

export const supabaseService = new SupabaseService(false); // Cliente público
export const supabaseAdminService = new SupabaseService(true); // Cliente admin
