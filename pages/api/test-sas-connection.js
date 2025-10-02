export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { codEvento = '244584759' } = req.query;

        const apiUrl = 'https://sas.sebrae.com.br/SasServiceDisponibilizacoes/Evento/Consultar';
        
        // Configurações de teste
        const configs = [
            {
                nome: 'Teste 1: Período atual (hoje)',
                params: {
                    CodSebrae: '24',
                    Situacao: 'D',
                    PeriodoInicial: '02/10/2025',
                    PeriodoFinal: '02/10/2025',
                    CodEvento: codEvento
                }
            },
            {
                nome: 'Teste 2: Período mês atual',
                params: {
                    CodSebrae: '24', 
                    Situacao: 'D',
                    PeriodoInicial: '01/10/2025',
                    PeriodoFinal: '31/10/2025',
                    CodEvento: codEvento
                }
            },
            {
                nome: 'Teste 3: Apenas código do evento',
                params: {
                    CodSebrae: '24',
                    CodEvento: codEvento
                }
            },
            {
                nome: 'Teste 4: Com situação A (Ativo)',
                params: {
                    CodSebrae: '24',
                    Situacao: 'A',
                    PeriodoInicial: '01/01/2025',
                    PeriodoFinal: '31/12/2025',
                    CodEvento: codEvento
                }
            }
        ];

        const resultados = [];

        for (const config of configs) {
            try {
                const queryParams = new URLSearchParams(config.params);
                const url = `${apiUrl}?${queryParams}`;
                
                console.log(`\n=== ${config.nome} ===`);
                console.log('URL:', url);
                console.log('Parâmetros:', config.params);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-req': process.env.SEBRAE_API_KEY
                    },
                });

                const responseText = await response.text();
                
                let dados = null;
                let parseError = null;
                
                try {
                    dados = JSON.parse(responseText);
                } catch (e) {
                    parseError = e.message;
                }

                resultados.push({
                    teste: config.nome,
                    params: config.params,
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    responseLength: responseText.length,
                    response: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
                    parseError,
                    dados: dados ? {
                        tipo: typeof dados,
                        isArray: Array.isArray(dados),
                        length: Array.isArray(dados) ? dados.length : 'N/A',
                        primeiroEvento: Array.isArray(dados) && dados.length > 0 ? {
                            CodEvento: dados[0].CodEvento,
                            TituloEvento: dados[0].TituloEvento,
                            DataEvento: dados[0].DataEvento
                        } : null
                    } : null,
                    sucesso: response.ok && dados && Array.isArray(dados) && dados.length > 0
                });

                // Se encontrou resultado, parar os testes
                if (response.ok && dados && Array.isArray(dados) && dados.length > 0) {
                    console.log('✅ Sucesso no', config.nome);
                    break;
                }

            } catch (error) {
                resultados.push({
                    teste: config.nome,
                    params: config.params,
                    erro: error.message,
                    sucesso: false
                });
            }
        }

        return res.status(200).json({
            message: 'Teste de conectividade com API SAS',
            codEvento,
            ambiente: {
                SEBRAE_API_KEY: process.env.SEBRAE_API_KEY ? 'Configurado' : 'NÃO CONFIGURADO',
                SEBRAE_COD_UF: process.env.SEBRAE_COD_UF || 'Não configurado',
                NODE_ENV: process.env.NODE_ENV
            },
            resultados,
            resumo: {
                totalTestes: resultados.length,
                sucessos: resultados.filter(r => r.sucesso).length,
                falhas: resultados.filter(r => !r.sucesso).length
            },
            melhorResultado: resultados.find(r => r.sucesso) || null
        });

    } catch (error) {
        console.error('Erro geral no teste:', error);
        return res.status(500).json({
            message: 'Erro interno no teste',
            error: error.message,
            stack: error.stack
        });
    }
}