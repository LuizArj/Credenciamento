import { query } from '../../lib/config/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Função para converter data brasileira (DD/MM/YYYY HH:mm:ss) para ISO
  const parseBrazilianDate = (dateStr) => {
    if (!dateStr) return null;

    try {
      // Formato esperado: "02/10/2025 10:50:39"
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hour, minute, second] = timePart.split(':');

      const date = new Date(year, month - 1, day, hour, minute, second);

      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateStr);
        return null;
      }

      return date.toISOString();
    } catch (error) {
      console.error('Erro ao processar data brasileira:', dateStr, error);
      return null;
    }
  };

  try {
    const { codEvento } = req.query;

    if (!codEvento) {
      return res.status(400).json({
        message: 'Código do evento é obrigatório',
      });
    }

    // ============================================================
    // STEP 1: Check local database first
    // ============================================================
    console.log(`[fetch-sas-event] Searching for event ${codEvento} in local database...`);

    try {
      const localResult = await query(
        `SELECT 
          id,
          nome,
          descricao,
          data_inicio,
          data_fim,
          local,
          endereco,
          capacidade,
          modalidade,
          tipo_evento as instrumento,
          status as situacao,
          publico_alvo as tipo_publico,
          gerente,
          coordenador,
          solucao,
          unidade,
          tipo_acao,
          codevento_sas
        FROM events 
        WHERE codevento_sas = $1 
        LIMIT 1`,
        [codEvento]
      );

      if (localResult.rows.length > 0) {
        const localEvent = localResult.rows[0];

        console.log(`[fetch-sas-event] Event ${codEvento} found in local database!`);

        // Normalize local event to match SAS format
        const eventoNormalizado = {
          id: localEvent.codevento_sas,
          nome: localEvent.nome,
          dataEvento: localEvent.data_inicio,
          periodoInicial: localEvent.data_inicio,
          periodoFinal: localEvent.data_fim,
          descricao: localEvent.descricao || localEvent.nome,
          local: localEvent.local || localEvent.endereco || '',
          capacidade: localEvent.capacidade || 0,
          cargaHoraria: 0, // Not tracked in events table
          modalidade: localEvent.modalidade || 'Presencial',
          instrumento: localEvent.instrumento || localEvent.tipo_evento || '',
          situacao: localEvent.situacao || localEvent.status || 'active',
          cidade: '', // Not tracked in events table
          vagasDisponiveis: 0, // Not tracked locally
          minParticipante: 0,
          maxParticipante: localEvent.capacidade || 0,
          preco: 0,
          gratuito: true,
          tipoPublico: localEvent.tipo_publico || '',
          projeto: localEvent.solucao || '',
          unidadeOrganizacional: localEvent.unidade || '',
          rawData: localEvent,
        };

        return res.status(200).json({
          message: 'Evento encontrado no banco de dados local',
          endpoint: 'LocalDatabase',
          source: 'cache',
          evento: eventoNormalizado,
        });
      }

      console.log(
        `[fetch-sas-event] Event ${codEvento} not found locally. Fetching from SAS API...`
      );
    } catch (dbError) {
      console.error('[fetch-sas-event] Database query error:', dbError);
      // Continue to SAS API on database error
    }

    // ============================================================
    // STEP 2: Fetch from SAS API (original logic)
    // ============================================================

    const UF = process.env.SEBRAE_COD_UF || '24';
    const BASE = 'https://sas.sebrae.com.br/SasServiceDisponibilizacoes/Evento';

    let endpointUsado = 'Selecionar';
    let eventoEncontrado = null;
    let ultimaRespostaTexto = '';
    let ultimaURL = '';
    let statusHTTP = 0;

    // 1) Tenta Selecionar (retorna objeto completo)
    try {
      // Algumas instâncias aceitam EventoID, outras aceitam CodEvento; vamos tentar ambos
      for (const paramName of ['EventoID', 'CodEvento']) {
        const paramsSelecionar = new URLSearchParams({ CodSebrae: UF });
        paramsSelecionar.append(paramName, codEvento);
        const urlSel = `${BASE}/Selecionar?${paramsSelecionar}`;
        ultimaURL = urlSel;

        const respSel = await fetch(urlSel, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-req': process.env.SEBRAE_API_KEY,
          },
        });
        statusHTTP = respSel.status;
        const text = await respSel.text();
        ultimaRespostaTexto = text;

        if (respSel.ok) {
          try {
            const dataSel = JSON.parse(text);
            // Selecionar retorna um objeto único quando encontra
            if (dataSel && typeof dataSel === 'object' && !Array.isArray(dataSel)) {
              eventoEncontrado = dataSel;
              endpointUsado = 'Selecionar';
              break;
            }
          } catch {}
        }
      }
    } catch (e) {
      // ignora e tenta fallback
    }

    // 2) Fallback: Consultar (pode retornar lista, pegamos o primeiro que bater)
    if (!eventoEncontrado) {
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const formatarData = (d) => d.toLocaleDateString('pt-BR');
      const anosParaTestar = [anoAtual, anoAtual - 1, anoAtual + 1];

      for (const ano of anosParaTestar) {
        try {
          const inicioAno = new Date(ano, 0, 1);
          const fimAno = new Date(ano, 11, 31);

          const params = new URLSearchParams({
            CodSebrae: UF,
            Situacao: 'D',
            PeriodoInicial: formatarData(inicioAno),
            PeriodoFinal: formatarData(fimAno),
            CodEvento: codEvento,
          });
          const url = `${BASE}/Consultar?${params}`;
          ultimaURL = url;
          const resp = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-req': process.env.SEBRAE_API_KEY,
            },
          });
          statusHTTP = resp.status;
          const text = await resp.text();
          ultimaRespostaTexto = text;

          if (resp.ok) {
            const data = JSON.parse(text);
            if (Array.isArray(data) && data.length > 0) {
              eventoEncontrado = data[0];
              endpointUsado = 'Consultar';
              break;
            }
          }
        } catch {}
      }
    }

    if (!eventoEncontrado) {
      return res.status(404).json({
        message: 'Evento não encontrado no SAS',
        codEvento,
        debug: { url: ultimaURL, status: statusHTTP, body: ultimaRespostaTexto?.slice(0, 500) },
      });
    }

    // 3) Normalizar para o mesmo formato utilizado em /api/sas-events
    const e = eventoEncontrado;
    const getBoolGratuito = () => {
      // Pode vir '1'/'0' ou 'S'/'N'
      if (e?.EventoGratuito === '1' || e?.EventoGratuito === 1) return true;
      if ((e?.EventoGratuito || '').toString().toUpperCase() === 'S') return true;
      return false;
    };

    const eventoNormalizado = {
      id: e.CodEvento || e.EventoID || e.id,
      nome: e.TituloEvento || e.Nome || 'Evento SAS',
      dataEvento: e.PeriodoInicial || e.DataHoraInicio || null,
      periodoInicial: e.PeriodoInicial || null,
      periodoFinal: e.PeriodoFinal || null,
      descricao: e.DescProduto || e.TituloEvento || e.Nome || '',
      local: e.Local || e.Logradouro || '',
      capacidade: e.MaxParticipante || e.MaximoParticipantes || 0,
      cargaHoraria: e.CargaHoraria || 0,
      modalidade: e.ModalidadeNome || 'Presencial',
      instrumento: e.InstrumentoNome || '',
      situacao: e.Situacao || '',
      cidade: e.NomeCidade || '',
      vagasDisponiveis: e.VagasDisponiveis || 0,
      minParticipante: e.MinParticipante || e.MinimoParticipantes || 0,
      maxParticipante: e.MaxParticipante || e.MaximoParticipantes || 0,
      preco: e.Preco || 0,
      gratuito: getBoolGratuito(),
      tipoPublico: e.TipoPublico || e.PublicoEvento || '',
      projeto: e.DescProjeto || '',
      unidadeOrganizacional: e.DescUnidadeOrganizacional || '',
      rawData: e,
    };

    return res.status(200).json({
      message: 'Evento encontrado na API do SAS',
      endpoint: endpointUsado,
      source: 'sas-api',
      evento: eventoNormalizado,
    });
  } catch (error) {
    console.error('Erro geral ao buscar evento SAS:', error);
    return res.status(500).json({
      message: 'Erro interno ao buscar evento no SAS',
      error: error.message,
    });
  }
}
