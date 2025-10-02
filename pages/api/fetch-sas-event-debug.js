export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { codEvento } = req.query;

        if (!codEvento) {
            return res.status(400).json({ 
                message: 'Código do evento é obrigatório' 
            });
        }

        // Testar com diferentes períodos
        const hoje = new Date();
        const umAnoAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
        const umAnoAfrente = new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate());

        // Formatar data como DD/MM/YYYY
        const formatarData = (data) => {
            return data.toLocaleDateString('pt-BR');
        };

        const periodoInicial = formatarData(umAnoAtras);
        const periodoFinal = formatarData(umAnoAfrente);

        const apiUrl = 'https://sas.sebrae.com.br/SasServiceDisponibilizacoes/Evento/Consultar';
        
        // Tentar primeiro com todos os parâmetros
        const queryParams = new URLSearchParams({
            CodSebrae: process.env.SEBRAE_COD_UF || '24',
            Situacao: 'D',
            PeriodoInicial: periodoInicial,
            PeriodoFinal: periodoFinal,
            CodEvento: codEvento
        });

        console.log('=== TENTATIVA 1: Busca com período amplo ===');
        console.log('Parâmetros:', Object.fromEntries(queryParams));
        console.log('URL:', `${apiUrl}?${queryParams}`);

        let response = await fetch(`${apiUrl}?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-req': process.env.SEBRAE_API_KEY
            },
        });

        console.log('Status resposta:', response.status);

        // Se der erro 400, tentar com período menor
        if (response.status === 400) {
            console.log('=== TENTATIVA 2: Período de 3 meses ===');
            
            const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);
            const tresMesesAfrente = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 28);
            
            const queryParams2 = new URLSearchParams({
                CodSebrae: process.env.SEBRAE_COD_UF || '24',
                Situacao: 'D',
                PeriodoInicial: formatarData(tresMesesAtras),
                PeriodoFinal: formatarData(tresMesesAfrente),
                CodEvento: codEvento
            });

            console.log('Parâmetros tentativa 2:', Object.fromEntries(queryParams2));
            
            response = await fetch(`${apiUrl}?${queryParams2}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-req': process.env.SEBRAE_API_KEY
                },
            });

            console.log('Status resposta tentativa 2:', response.status);
        }

        // Se ainda der erro, tentar só com código do evento (sem período)
        if (response.status === 400) {
            console.log('=== TENTATIVA 3: Apenas com código do evento ===');
            
            const queryParams3 = new URLSearchParams({
                CodSebrae: process.env.SEBRAE_COD_UF || '24',
                CodEvento: codEvento
            });

            console.log('Parâmetros tentativa 3:', Object.fromEntries(queryParams3));
            
            response = await fetch(`${apiUrl}?${queryParams3}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-req': process.env.SEBRAE_API_KEY
                },
            });

            console.log('Status resposta tentativa 3:', response.status);
        }

        // Tentar ler a resposta
        const responseText = await response.text();
        console.log('Resposta completa:', responseText.substring(0, 500) + '...');

        if (!response.ok) {
            return res.status(response.status).json({
                message: `Erro na API do SAS: ${response.status} ${response.statusText}`,
                details: responseText,
                debug: {
                    tentativas: [
                        'Período amplo (1 ano)',
                        'Período médio (3 meses)', 
                        'Apenas código do evento'
                    ],
                    ultimaUrl: response.url || 'URL não disponível',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-req': process.env.SEBRAE_API_KEY ? 'Configurado' : 'NÃO CONFIGURADO',
                        'CodSebrae': process.env.SEBRAE_COD_UF || '24'
                    }
                }
            });
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Erro ao fazer parse do JSON:', parseError);
            return res.status(500).json({
                message: 'Resposta inválida da API do SAS',
                response: responseText.substring(0, 1000),
                parseError: parseError.message
            });
        }
        
        console.log('Dados parseados com sucesso. Total de eventos:', Array.isArray(data) ? data.length : 'não é array');

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(404).json({
                message: 'Evento não encontrado no SAS',
                codEvento,
                response: data,
                debug: {
                    tipoResposta: typeof data,
                    isArray: Array.isArray(data),
                    tamanho: Array.isArray(data) ? data.length : 'N/A'
                }
            });
        }

        // Pegar o primeiro evento encontrado
        const evento = data[0];
        console.log('Evento encontrado:', evento.CodEvento, '-', evento.TituloEvento);
        
        // Formatar dados para o padrão do nosso sistema
        const eventoFormatado = {
            codevento_sas: evento.CodEvento?.toString(),
            nome: evento.TituloEvento || '',
            descricao: evento.DescricaoEvento || evento.TituloEvento || '',
            data_inicio: evento.DataEvento ? new Date(evento.DataEvento).toISOString() : new Date().toISOString(),
            data_fim: evento.DataEvento ? new Date(evento.DataEvento).toISOString() : new Date().toISOString(),
            local: evento.LocalEvento || 'Local não informado',
            endereco: evento.EnderecoEvento ? {
                logradouro: evento.EnderecoEvento,
                cidade: evento.CidadeEvento || '',
                uf: evento.UfEvento || 'RR'
            } : {},
            capacidade: parseInt(evento.QtdVagas) || 100,
            modalidade: 'presencial',
            tipo_evento: evento.TipoEvento || 'evento_sas',
            publico_alvo: evento.PublicoAlvo || 'Público geral',
            gerente: evento.ResponsavelEvento || '',
            coordenador: evento.CoordenadorEvento || '',
            solucao: evento.SolucaoEvento || 'Sistema SAS',
            unidade: 'SEBRAE-RR',
            tipo_acao: evento.TipoAcao || 'Evento',
            status: 'active',
            meta_participantes: parseInt(evento.QtdVagas) || 100,
            observacoes: `Evento importado do SAS. Código original: ${evento.CodEvento}`,
            
            // Dados originais para referência
            rawData: evento
        };

        return res.status(200).json({
            message: 'Evento encontrado com sucesso',
            evento: eventoFormatado,
            debug: {
                totalEventosEncontrados: data.length,
                codigo: evento.CodEvento,
                titulo: evento.TituloEvento
            }
        });

    } catch (error) {
        console.error('Erro geral ao buscar evento SAS:', error);
        return res.status(500).json({
            message: 'Erro interno ao buscar evento no SAS',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}