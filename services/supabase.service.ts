/**
 * Supabase Service
 *
 * @description Serviço centralizado para operações no Supabase
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, supabaseClient } from '@/lib/config/supabase';
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
  private client: SupabaseClient;

  constructor(useServiceRole: boolean = false) {
    // Use centralized Supabase clients
    this.client = useServiceRole ? getSupabaseAdmin() : supabaseClient;
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

    let query = this.client.from('events').select('*', { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,local.ilike.%${search}%,descricao.ilike.%${search}%`
      );
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
    const { data, error } = await this.client.from('events').select('*').eq('id', eventId).single();

    if (error) {
      throw new Error(`Erro ao buscar evento: ${error.message}`);
    }

    return data;
  }

  /**
   * Busca estatísticas de um evento
   */
  async getEventStats(eventId: string): Promise<EventStats> {
    const { data: registrations, error } = await this.client
      .from('registrations')
      .select('status')
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const total = registrations?.length || 0;
    const credenciados = registrations?.filter((r) => r.status === 'confirmed').length || 0;
    const pendentes = registrations?.filter((r) => r.status === 'registered').length || 0;
    const cancelados = registrations?.filter((r) => r.status === 'cancelled').length || 0;
    // Para presença, a forma correta é via check_ins; aqui mantemos 0 pois esta query não traz check_ins
    const checked_in = 0;

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
    const { error } = await this.client.from('events').delete().eq('id', eventId);

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

    // Se estiver filtrando por event_id, precisamos usar JOIN com registrations
    if (event_id) {
      let query = this.client
        .from('registrations')
        .select(
          `
          participant_id,
          status,
          participants!inner (
            id,
            cpf,
            nome,
            email,
            telefone,
            company_id,
            cargo,
            endereco,
            fonte,
            created_at,
            updated_at
          )
        `,
          { count: 'exact' }
        )
        .eq('event_id', event_id);

      // Aplicar filtros
      if (search) {
        query = query.or(
          `participants.nome.ilike.%${search}%,participants.email.ilike.%${search}%,participants.cpf.ilike.%${search}%`
        );
      }

      if (status_credenciamento && status_credenciamento !== 'all') {
        // Mapear status_credenciamento para status da tabela registrations
        const statusMap: Record<string, string> = {
          credentialed: 'confirmed',
          pending: 'registered',
          cancelled: 'cancelled',
        };
        query = query.eq('status', statusMap[status_credenciamento] || status_credenciamento);
      }

      if (source && source !== 'all') {
        query = query.eq('participants.fonte', source);
      }

      // Paginação (antes da ordenação para evitar conflitos)
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Erro ao buscar participantes: ${error.message}`);
      }

      // Transformar dados para formato esperado
      const participants =
        data?.map((reg: any) => ({
          ...reg.participants,
          status_credenciamento:
            reg.status === 'confirmed'
              ? 'credentialed'
              : reg.status === 'registered'
                ? 'pending'
                : reg.status === 'cancelled'
                  ? 'cancelled'
                  : reg.status,
          // checked_in deve ser derivado via check_ins em consultas específicas
          checked_in: false,
        })) || [];

      // Ordenação manual em memória (Supabase não suporta order em JOINs nested)
      if (orderBy && participants.length > 0) {
        participants.sort((a: any, b: any) => {
          const aVal = a[orderBy];
          const bVal = b[orderBy];
          if (aVal === bVal) return 0;
          if (order === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        data: participants,
        count: count || 0,
        page,
        limit,
        totalPages,
      };
    }

    // Query sem filtro de event_id (busca direta em participants)
    let query = this.client.from('participants').select('*', { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%`);
    }

    if (source && source !== 'all') {
      query = query.eq('fonte', source);
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

    // Adicionar campo status_credenciamento padrão quando buscar sem filtro de evento
    const participantsWithStatus =
      data?.map((p) => ({
        ...p,
        status_credenciamento: 'pending', // Status padrão quando não há relação com evento específico
        checked_in_at: null,
      })) || [];

    return {
      data: participantsWithStatus,
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
    // Buscar pelo CPF do participante -> pegar id, depois buscar registrations + evento
    const { data: p, error: pErr } = await this.client
      .from('participants')
      .select('id, cpf')
      .eq('cpf', participantCpf)
      .single();

    if (pErr || !p) {
      throw new Error(`Participante não encontrado pelo CPF`);
    }

    const { data, error } = await this.client
      .from('registrations')
      .select(
        `
        event_id,
        status,
        data_inscricao,
        updated_at,
        check_ins:check_ins!left ( data_check_in ),
        events:event_id (
          nome,
          data_inicio
        )
      `
      )
      .eq('participant_id', p.id)
      .order('data_inscricao', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      event_id: item.event_id,
      event_nome: item.events?.nome || 'Evento não encontrado',
      event_data_inicio: item.events?.data_inicio || '',
      status_credenciamento: item.status === 'confirmed' ? 'credentialed' : item.status,
      credenciado_em: item.data_inscricao || null,
      checked_in: Array.isArray(item.check_ins) && item.check_ins.length > 0,
      checked_in_at:
        Array.isArray(item.check_ins) && item.check_ins.length > 0
          ? item.check_ins[0].data_check_in
          : null,
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
    const { error } = await this.client.from('participants').delete().eq('id', participantId);

    if (error) {
      throw new Error(`Erro ao deletar participante: ${error.message}`);
    }
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

export const supabaseService = new SupabaseService(false); // Cliente público
export const supabaseAdminService = new SupabaseService(true); // Cliente admin
