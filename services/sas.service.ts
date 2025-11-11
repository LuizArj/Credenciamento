/**
 * SAS Service
 *
 * @description Serviço de integração com a API do SAS (Sistema de Atendimento do Sebrae)
 * @version 1.0.0
 */

import type { SASEvent, SASParticipant } from '@/schemas';
import { normalizeCPF } from '@/lib/utils/cpf';
import { query, withTransaction } from '@/lib/config/database';
import type { Database } from '@/types/database.types';

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
  CPF: number;
  NomeRazaoSocialPF: string;
  NomeRazaoSocialPJ: string | null;
  Email: string;
  Telefone: string;
  CNPJ: string | null;
  Situacao: string; // "Inscrito", "Reserva", etc.
  TipoParticipanteNome: string;
  EventoID: number;
  EventoNome: string;
  DataInclusao: string;
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

// Note: this service writes directly to Postgres via query() and withTransaction()

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
  // Normalizar modalidade para lowercase conforme CHECK constraint do banco
  let modalidade = 'presencial'; // default
  if (sasEvent.ModalidadeNome) {
    const modalidadeLower = sasEvent.ModalidadeNome.toLowerCase();
    if (modalidadeLower.includes('online') || modalidadeLower.includes('ead')) {
      modalidade = 'online';
    } else if (modalidadeLower.includes('hibrido') || modalidadeLower.includes('híbrido')) {
      modalidade = 'hibrido';
    }
  }

  return {
    codevento: sasEvent.CodEvento?.toString() || '',
    nome: sasEvent.TituloEvento || 'Evento SAS',
    descricao: sasEvent.DescProduto || sasEvent.TituloEvento || '',
    data_inicio: sasEvent.PeriodoInicial || new Date().toISOString(),
    data_fim: sasEvent.PeriodoFinal || new Date().toISOString(),
    local: sasEvent.Local || 'Local não informado',
    modalidade,
    // Alinhar com o enum do banco: usar 'draft' quando não disponível
    status: sasEvent.Situacao === 'Disponível' ? 'active' : 'draft',
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
  // Formatar CPF para string com zeros à esquerda
  const cpf = String(sasParticipant.CPF).padStart(11, '0');

  return {
    cpf,
    nome: sasParticipant.NomeRazaoSocialPF,
    email: sasParticipant.Email?.toLowerCase() || '',
    telefone: sasParticipant.Telefone || undefined,
    empresa: sasParticipant.NomeRazaoSocialPJ || undefined,
    cargo: undefined,
    vinculo: sasParticipant.TipoParticipanteNome || undefined,
    categoria: sasParticipant.TipoParticipanteNome || undefined,
    status: sasParticipant.Situacao || undefined,
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
    const { codEvento } = options;
    const apiUrl = `${SAS_BASE_URL}/Evento/ConsultarParticipante`;

    const queryParams = new URLSearchParams({
      CodSebrae: SAS_COD_UF,
      CodEvento: codEvento,
    });

    console.log(`[SAS] Buscando participantes do evento ${codEvento} em: ${apiUrl}?${queryParams}`);

    const response = await fetch(`${apiUrl}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-req': SAS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SAS] Erro ao buscar participantes:`, errorText);
      throw new Error(
        `Erro ao buscar participantes do evento ${codEvento}: ${response.status} ${response.statusText}`
      );
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
    const existingRes = await query('SELECT id FROM events WHERE codevento_sas = $1 LIMIT 1', [
      eventData.codevento,
    ]);
    const existingEvent = existingRes.rows[0];
    if (existingEvent && !overwrite) {
      console.log(`[SAS] Evento ${eventData.codevento} já existe no banco`);
      return existingEvent.id;
    }

    const now = new Date().toISOString();
    if (existingEvent && overwrite) {
      // Atualizar
      const updateRes = await query(
        `UPDATE events SET nome = $1, descricao = $2, data_inicio = $3, data_fim = $4, local = $5, modalidade = $6, status = $7, tipo_evento = $8, publico_alvo = $9, solucao = $10, unidade = $11, codevento_sas = $12, updated_at = $13 WHERE id = $14`,
        [
          eventData.nome,
          eventData.descricao ?? null,
          eventData.data_inicio,
          eventData.data_fim ?? null,
          eventData.local,
          eventData.modalidade ?? null,
          eventData.status ?? 'active',
          eventData.tipo_evento ?? null,
          eventData.publico_alvo ?? null,
          eventData.solucao ?? null,
          eventData.unidade ?? null,
          eventData.codevento,
          now,
          existingEvent.id,
        ]
      );

      console.log(`[SAS] ✅ Evento ${eventData.codevento} atualizado`);
      return existingEvent.id;
    } else {
      // Criar novo evento
      const insertRes = await query(
        `INSERT INTO events (nome, descricao, data_inicio, data_fim, local, modalidade, status, tipo_evento, publico_alvo, solucao, unidade, codevento_sas, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [
          eventData.nome,
          eventData.descricao ?? null,
          eventData.data_inicio,
          eventData.data_fim ?? null,
          eventData.local,
          eventData.modalidade ?? null,
          eventData.status ?? 'active',
          eventData.tipo_evento ?? null,
          eventData.publico_alvo ?? null,
          eventData.solucao ?? null,
          eventData.unidade ?? null,
          eventData.codevento,
          now,
          now,
        ]
      );

      const newId = insertRes.rows[0]?.id;
      console.log(`[SAS] ✅ Evento ${eventData.codevento} criado`);
      return newId;
    }
  }

  /**
   * Sincroniza participantes do SAS para o Supabase
   * IMPORTANTE: participants não tem event_id. O relacionamento é via registrations.
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

    console.log(`[SAS] 🔄 Starting syncParticipantsToSupabase for event ${eventId}`);
    console.log(`[SAS] 📋 Processing ${participants.length} participants (overwrite=${overwrite})`);

    for (const participant of participants) {
      try {
        console.log(
          `[SAS] 👤 Processing participant: ${participant.nome} (CPF: ${participant.cpf})`
        );

        // Verificar se participante já existe (por CPF)
        const pRes = await query('SELECT id FROM participants WHERE cpf = $1 LIMIT 1', [
          participant.cpf,
        ]);
        const existingParticipant = pRes.rows[0];

        const participantData = {
          nome: participant.nome,
          email: participant.email || '',
          cpf: participant.cpf,
          telefone: participant.telefone || null,
          fonte: 'sas' as const,
        };

        let participantId: string;

        if (existingParticipant) {
          participantId = existingParticipant.id;
          console.log(`[SAS]   ✓ Participant exists with ID: ${participantId}`);
          if (overwrite) {
            await query(
              'UPDATE participants SET nome = $1, email = $2, telefone = $3, fonte = $4, updated_at = $5 WHERE id = $6',
              [
                participantData.nome,
                participantData.email,
                participantData.telefone,
                participantData.fonte,
                new Date().toISOString(),
                participantId,
              ]
            );
            console.log(`[SAS]   ✓ Participant data updated`);
          }
          // Continue to process registration even if participant exists
        } else {
          const insertP = await query(
            'INSERT INTO participants (nome, email, cpf, telefone, fonte, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [
              participantData.nome,
              participantData.email,
              participantData.cpf,
              participantData.telefone,
              participantData.fonte,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          participantId = insertP.rows[0]?.id;
          if (!participantId) {
            console.error(`[SAS]   ✗ Failed to insert participant ${participant.cpf}`);
            skipped++;
            continue;
          }
          console.log(`[SAS]   ✓ New participant created with ID: ${participantId}`);
          inserted++;
        }

        // Verificar se já existe registration para este participante neste evento
        console.log(`[SAS]   🔍 Checking registration for event ${eventId}...`);
        const regRes = await query(
          'SELECT id, status FROM registrations WHERE event_id = $1 AND participant_id = $2 LIMIT 1',
          [eventId, participantId]
        );
        const existingReg = regRes.rows[0];

        if (existingReg) {
          console.log(
            `[SAS]   ✓ Registration exists: ${existingReg.id} (status: ${existingReg.status})`
          );
          if (overwrite) {
            // Map SAS status to valid DB status: pending, confirmed, cancelled, checked_in, waiting_list
            const newStatus = participant.status === 'confirmed' ? 'confirmed' : 'pending';
            await query('UPDATE registrations SET status = $1, updated_at = $2 WHERE id = $3', [
              newStatus,
              new Date().toISOString(),
              existingReg.id,
            ]);
            console.log(`[SAS]   ✓ Registration updated to status: ${newStatus}`);
            updated++;
          } else {
            console.log(`[SAS]   ⊘ Skipping (overwrite=false)`);
            skipped++;
          }
        } else {
          console.log(`[SAS]   📝 Creating new registration...`);
          // Registration doesn't exist - always create it
          // Map SAS status to valid DB status: pending, confirmed, cancelled, checked_in, waiting_list
          const registrationStatus = participant.status === 'confirmed' ? 'confirmed' : 'pending';
          const insertR = await query(
            'INSERT INTO registrations (event_id, participant_id, status, data_inscricao, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
            [
              eventId,
              participantId,
              registrationStatus,
              new Date().toISOString(),
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          const newRegId = insertR.rows[0]?.id;
          console.log(
            `[SAS]   ✓ Registration created: ${newRegId} (status: ${registrationStatus})`
          );
          inserted++;
        }
      } catch (error) {
        console.error(`[SAS] Erro ao processar participante ${participant.cpf}:`, error);
        skipped++;
      }
    }

    console.log(
      `[SAS] ✅ Sincronização concluída: ${inserted} inseridos, ${updated} atualizados, ${skipped} ignorados`
    );

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
