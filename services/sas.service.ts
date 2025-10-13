/**
 * SAS Service
 * 
 * @description Serviço de integração com a API do SAS (Sistema de Atendimento do Sebrae)
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import type { SASEvent, SASParticipant } from '@/schemas';

// ============================================================================
// TYPES
// ============================================================================

interface SASEventRaw {
  CodEvento: string;
  TituloEvento: string;
  DescProduto?: string;
  PeriodoInicial: string;
  PeriodoFinal: string;
  Local: string;
  NomeCidade?: string;
  MaxParticipante: string;
  MinParticipante?: string;
  VagasDisponiveis?: string;
  ModalidadeNome?: string;
  ModalidadeID?: string;
  InstrumentoNome?: string;
  TipoPublico?: string;
  Situacao: string;
  DescProjeto?: string;
  CodProjeto?: string;
  DescUnidadeOrganizacional?: string;
  DescAcao?: string;
  CodAcao?: string;
  CodProduto?: string;
  CargaHoraria?: string;
  Preco?: string;
  EventoGratuito?: string;
  FrequenciaMin?: string;
  TotalDiasEvento?: string;
  DataInclusao?: string;
  DataUltimaAlteracao?: string;
  DataEvento?: string;
}

interface SASParticipantRaw {
  CPF: string;
  Nome: string;
  Email?: string;
  Telefone?: string;
  Empresa?: string;
  Cargo?: string;
  Vinculo?: string;
  Categoria?: string;
  Status?: string;
}

interface FetchEventOptions {
  codEvento: string;
  year?: number;
}

interface FetchParticipantsOptions {
  codEvento: string;
  year?: number;
}

interface SyncEventOptions {
  eventData: SASEvent;
  overwrite?: boolean;
}

interface SyncParticipantsOptions {
  eventId: string;
  participants: SASParticipant[];
  overwrite?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SAS_BASE_URL = 'https://sas.sebrae.com.br/SasServiceDisponibilizacoes';
const SAS_API_KEY = process.env.SEBRAE_API_KEY || '';
const SAS_COD_UF = process.env.SEBRAE_COD_UF || '24'; // Roraima

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte data brasileira (DD/MM/YYYY HH:mm:ss) para ISO
 */
function parseBrazilianDate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hour, minute, second] = (timePart || '00:00:00').split(':');

    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );

    if (isNaN(date.getTime())) {
      console.warn('Data inválida:', dateStr);
      return null;
    }

    return date.toISOString();
  } catch (error) {
    console.error('Erro ao processar data brasileira:', dateStr, error);
    return null;
  }
}

/**
 * Formata data para o padrão brasileiro (DD/MM/YYYY)
 */
function formatDateBrazilian(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Mapeia dados brutos do SAS para o formato do sistema
 */
function mapSASEventToSystem(sasEvent: SASEventRaw): SASEvent {
  return {
    codevento: sasEvent.CodEvento?.toString() || '',
    nome: sasEvent.TituloEvento || 'Evento SAS',
    descricao: sasEvent.DescProduto || sasEvent.TituloEvento || '',
    data_inicio: sasEvent.PeriodoInicial || new Date().toISOString(),
    data_fim: sasEvent.PeriodoFinal || new Date().toISOString(),
    local: sasEvent.Local || 'Local não informado',
    modalidade: sasEvent.ModalidadeNome?.toUpperCase() as 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO' || 'PRESENCIAL',
    status: sasEvent.Situacao === 'Disponível' ? 'active' : 'inactive',
    tipo_evento: sasEvent.InstrumentoNome || 'Evento',
    publico_alvo: sasEvent.TipoPublico === 'Aberto' ? 'Público geral' : 'Público específico',
    instrumento: sasEvent.InstrumentoNome || '',
    capacidade: parseInt(sasEvent.MaxParticipante) || undefined,
    minimo_participantes: parseInt(sasEvent.MinParticipante || '0') || undefined,
    vagas_disponiveis: parseInt(sasEvent.VagasDisponiveis || '0') || undefined,
    carga_horaria: parseFloat(sasEvent.CargaHoraria || '0') || undefined,
    preco: parseFloat(sasEvent.Preco || '0') || undefined,
    gratuito: sasEvent.EventoGratuito === '1',
    solucao: sasEvent.DescProjeto || 'Sistema SAS',
    unidade: sasEvent.DescUnidadeOrganizacional || 'SEBRAE-RR',
    codigo_projeto: sasEvent.CodProjeto || undefined,
    gerente: '',
    coordenador: '',
  };
}

/**
 * Mapeia participante do SAS para o formato do sistema
 */
function mapSASParticipantToSystem(sasParticipant: SASParticipantRaw): SASParticipant {
  return {
    cpf: sasParticipant.CPF.replace(/\D/g, ''), // Remove formatação
    nome: sasParticipant.Nome,
    email: sasParticipant.Email,
    telefone: sasParticipant.Telefone,
    empresa: sasParticipant.Empresa,
    cargo: sasParticipant.Cargo,
    vinculo: sasParticipant.Vinculo,
    categoria: sasParticipant.Categoria,
    status: sasParticipant.Status,
  };
}

// ============================================================================
// SAS SERVICE CLASS
// ============================================================================

export class SASService {
  /**
   * Busca evento no SAS por código
   */
  async fetchEvent(options: FetchEventOptions): Promise<SASEvent> {
    const { codEvento, year } = options;
    const apiUrl = `${SAS_BASE_URL}/Evento/Consultar`;

    // Anos para testar (atual, anterior e próximo)
    const currentYear = year || new Date().getFullYear();
    const yearsToTest = [currentYear, currentYear - 1, currentYear + 1];

    let eventoEncontrado: SASEventRaw | null = null;

    // Tentar diferentes anos
    for (const testYear of yearsToTest) {
      try {
        const startDate = new Date(testYear, 0, 1); // 1º de janeiro
        const endDate = new Date(testYear, 11, 31); // 31 de dezembro

        const queryParams = new URLSearchParams({
          CodSebrae: SAS_COD_UF,
          Situacao: 'D',
          PeriodoInicial: formatDateBrazilian(startDate),
          PeriodoFinal: formatDateBrazilian(endDate),
          CodEvento: codEvento,
        });

        console.log(`[SAS] Buscando evento ${codEvento} no ano ${testYear}`);

        const response = await fetch(`${apiUrl}?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-req': SAS_API_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();

          if (Array.isArray(data) && data.length > 0) {
            eventoEncontrado = data[0];
            console.log(`[SAS] ✅ Evento encontrado no ano ${testYear}`);
            break;
          }
        }
      } catch (error) {
        console.error(`[SAS] Erro ao buscar no ano ${testYear}:`, error);
        continue;
      }
    }

    // Tentar sem período específico
    if (!eventoEncontrado) {
      console.log('[SAS] Tentando busca sem período específico...');

      const queryParams = new URLSearchParams({
        CodSebrae: SAS_COD_UF,
        CodEvento: codEvento,
      });

      const response = await fetch(`${apiUrl}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-req': SAS_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          eventoEncontrado = data[0];
          console.log('[SAS] ✅ Evento encontrado sem período');
        }
      }
    }

    if (!eventoEncontrado) {
      throw new Error(`Evento ${codEvento} não encontrado no SAS`);
    }

    return mapSASEventToSystem(eventoEncontrado);
  }

  /**
   * Busca participantes de um evento no SAS
   */
  async fetchParticipants(options: FetchParticipantsOptions): Promise<SASParticipant[]> {
    const { codEvento, year } = options;
    const apiUrl = `${SAS_BASE_URL}/Evento/ConsultarParticipantes`;

    const currentYear = year || new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    const queryParams = new URLSearchParams({
      CodSebrae: SAS_COD_UF,
      CodEvento: codEvento,
      PeriodoInicial: formatDateBrazilian(startDate),
      PeriodoFinal: formatDateBrazilian(endDate),
    });

    console.log(`[SAS] Buscando participantes do evento ${codEvento}`);

    const response = await fetch(`${apiUrl}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-req': SAS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar participantes do evento ${codEvento}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Formato de resposta inválido da API SAS');
    }

    console.log(`[SAS] ✅ ${data.length} participantes encontrados`);

    return data.map(mapSASParticipantToSystem);
  }

  /**
   * Sincroniza evento do SAS para o Supabase
   */
  async syncEventToSupabase(options: SyncEventOptions): Promise<string> {
    const { eventData, overwrite = false } = options;

    // Verificar se evento já existe
    const { data: existingEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('codevento_sas', eventData.codevento)
      .single();

    if (existingEvent && !overwrite) {
      console.log(`[SAS] Evento ${eventData.codevento} já existe no banco`);
      return existingEvent.id;
    }

    // Preparar dados para inserção/atualização
    const eventToSave = {
      nome: eventData.nome,
      descricao: eventData.descricao,
      data_inicio: eventData.data_inicio,
      data_fim: eventData.data_fim,
      local: eventData.local,
      modalidade: eventData.modalidade,
      status: eventData.status,
      tipo_evento: eventData.tipo_evento,
      publico_alvo: eventData.publico_alvo,
      instrumento: eventData.instrumento,
      capacidade: eventData.capacidade,
      minimo_participantes: eventData.minimo_participantes,
      vagas_disponiveis: eventData.vagas_disponiveis,
      carga_horaria: eventData.carga_horaria,
      preco: eventData.preco,
      gratuito: eventData.gratuito,
      solucao: eventData.solucao,
      unidade: eventData.unidade,
      projeto: eventData.codigo_projeto,
      codevento_sas: eventData.codevento,
      updated_at: new Date().toISOString(),
    };

    if (existingEvent && overwrite) {
      // Atualizar evento existente
      const { error } = await supabaseAdmin
        .from('events')
        .update(eventToSave)
        .eq('id', existingEvent.id);

      if (error) {
        throw new Error(`Erro ao atualizar evento: ${error.message}`);
      }

      console.log(`[SAS] ✅ Evento ${eventData.codevento} atualizado`);
      return existingEvent.id;
    } else {
      // Criar novo evento
      const { data: newEvent, error } = await supabaseAdmin
        .from('events')
        .insert({ ...eventToSave, created_at: new Date().toISOString() })
        .select('id')
        .single();

      if (error || !newEvent) {
        throw new Error(`Erro ao criar evento: ${error?.message}`);
      }

      console.log(`[SAS] ✅ Evento ${eventData.codevento} criado`);
      return newEvent.id;
    }
  }

  /**
   * Sincroniza participantes do SAS para o Supabase
   */
  async syncParticipantsToSupabase(options: SyncParticipantsOptions): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }> {
    const { eventId, participants, overwrite = false } = options;

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const participant of participants) {
      try {
        // Verificar se participante já existe neste evento
        const { data: existing } = await supabaseAdmin
          .from('participants')
          .select('id')
          .eq('event_id', eventId)
          .eq('cpf', participant.cpf)
          .single();

        const participantData = {
          event_id: eventId,
          nome: participant.nome,
          email: participant.email || '',
          cpf: participant.cpf,
          telefone: participant.telefone,
          empresa: participant.empresa,
          cargo: participant.cargo,
          vinculo: participant.vinculo,
          categoria: participant.categoria,
          source: 'sas' as const,
          status_credenciamento: 'pending' as const,
        };

        if (existing) {
          if (overwrite) {
            // Atualizar participante existente
            const { error } = await supabaseAdmin
              .from('participants')
              .update({ ...participantData, updated_at: new Date().toISOString() })
              .eq('id', existing.id);

            if (error) {
              console.error(`[SAS] Erro ao atualizar participante ${participant.cpf}:`, error);
              skipped++;
            } else {
              updated++;
            }
          } else {
            skipped++;
          }
        } else {
          // Criar novo participante
          const { error } = await supabaseAdmin
            .from('participants')
            .insert({ ...participantData, created_at: new Date().toISOString() });

          if (error) {
            console.error(`[SAS] Erro ao inserir participante ${participant.cpf}:`, error);
            skipped++;
          } else {
            inserted++;
          }
        }
      } catch (error) {
        console.error(`[SAS] Erro ao processar participante ${participant.cpf}:`, error);
        skipped++;
      }
    }

    console.log(`[SAS] ✅ Sincronização concluída: ${inserted} inseridos, ${updated} atualizados, ${skipped} ignorados`);

    return { inserted, updated, skipped };
  }

  /**
   * Busca e sincroniza evento completo (evento + participantes)
   */
  async syncCompleteEvent(
    codEvento: string,
    overwrite: boolean = false
  ): Promise<{
    eventId: string;
    event: SASEvent;
    syncResult: {
      inserted: number;
      updated: number;
      skipped: number;
    };
  }> {
    console.log(`[SAS] Iniciando sincronização completa do evento ${codEvento}`);

    // 1. Buscar dados do evento
    const eventData = await this.fetchEvent({ codEvento });

    // 2. Sincronizar evento para Supabase
    const eventId = await this.syncEventToSupabase({ eventData, overwrite });

    // 3. Buscar participantes
    const participants = await this.fetchParticipants({ codEvento });

    // 4. Sincronizar participantes para Supabase
    const syncResult = await this.syncParticipantsToSupabase({
      eventId,
      participants,
      overwrite,
    });

    console.log(`[SAS] ✅ Sincronização completa finalizada`);

    return {
      eventId,
      event: eventData,
      syncResult,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const sasService = new SASService();
