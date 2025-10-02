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
                message: 'Código do evento é obrigatório' 
            });
        }

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        
        // Formatar data como DD/MM/YYYY
        const formatarData = (data) => {
            return data.toLocaleDateString('pt-BR');
        };

        const apiUrl = 'https://sas.sebrae.com.br/SasServiceDisponibilizacoes/Evento/Consultar';
        
        // Lista de anos para testar (ano atual, anterior e próximo)
        const anosParaTestar = [anoAtual, anoAtual - 1, anoAtual + 1];
        
        let response;
        let queryParams;
        let eventoEncontrado = null;
        
        // Tentar diferentes anos
        for (const ano of anosParaTestar) {
            try {
                // Período do ano completo (mesmo ano)
                const inicioAno = new Date(ano, 0, 1); // 1º de janeiro
                const fimAno = new Date(ano, 11, 31);  // 31 de dezembro
                
                queryParams = new URLSearchParams({
                    CodSebrae: process.env.SEBRAE_COD_UF || '24',
                    Situacao: 'D',
                    PeriodoInicial: formatarData(inicioAno),
                    PeriodoFinal: formatarData(fimAno),
                    CodEvento: codEvento
                });

                console.log(`Testando ano ${ano} - URL:`, `${apiUrl}?${queryParams}`);
                
                response = await fetch(`${apiUrl}?${queryParams}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-req': process.env.SEBRAE_API_KEY
                    },
                });

                console.log(`Ano ${ano} - Status:`, response.status);
                
                if (response.ok) {
                    const responseText = await response.text();
                    
                    try {
                        const data = JSON.parse(responseText);
                        
                        if (Array.isArray(data) && data.length > 0) {
                            eventoEncontrado = data[0];
                            console.log(`✅ Evento encontrado no ano ${ano}:`, eventoEncontrado.CodEvento, eventoEncontrado.TituloEvento);
                            break;
                        }
                    } catch (parseError) {
                        console.log(`Erro de parse no ano ${ano}:`, parseError.message);
                    }
                }
                
            } catch (fetchError) {
                console.error(`Erro na requisição do ano ${ano}:`, fetchError.message);
                continue;
            }
        }

        // Se não encontrou em nenhum ano, tentar sem período
        if (!eventoEncontrado) {
            console.log('Tentando sem período específico...');
            
            queryParams = new URLSearchParams({
                CodSebrae: process.env.SEBRAE_COD_UF || '24',
                CodEvento: codEvento
            });

            response = await fetch(`${apiUrl}?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-req': process.env.SEBRAE_API_KEY
                },
            });

            if (response.ok) {
                const responseText = await response.text();
                
                try {
                    const data = JSON.parse(responseText);
                    
                    if (Array.isArray(data) && data.length > 0) {
                        eventoEncontrado = data[0];
                        console.log('✅ Evento encontrado sem período:', eventoEncontrado.CodEvento, eventoEncontrado.TituloEvento);
                    }
                } catch (parseError) {
                    console.log('Erro de parse sem período:', parseError.message);
                }
            }
        }

        // Se ainda não encontrou, retornar erro
        if (!eventoEncontrado) {
            const responseText = await response.text();
            
            return res.status(404).json({
                message: 'Evento não encontrado no SAS',
                codEvento,
                anosTestados: anosParaTestar,
                ultimaResposta: responseText,
                debug: {
                    url: `${apiUrl}?${queryParams}`,
                    status: response.status
                }
            });
        }

        // Formatar dados para o padrão do nosso sistema
        const eventoFormatado = {
            codevento_sas: eventoEncontrado.CodEvento?.toString(),
            nome: eventoEncontrado.TituloEvento || 'Evento SAS',
            descricao: eventoEncontrado.DescProduto || eventoEncontrado.TituloEvento || '',
            data_inicio: eventoEncontrado.PeriodoInicial ? new Date(eventoEncontrado.PeriodoInicial).toISOString() : new Date().toISOString(),
            data_fim: eventoEncontrado.PeriodoFinal ? new Date(eventoEncontrado.PeriodoFinal).toISOString() : new Date().toISOString(),
            local: eventoEncontrado.Local || 'Local não informado',
            endereco: {
                logradouro: eventoEncontrado.Local || '',
                cidade: eventoEncontrado.NomeCidade || '',
                uf: 'RR'
            },
            capacidade: parseInt(eventoEncontrado.MaxParticipante) || 100,
            modalidade: eventoEncontrado.ModalidadeNome?.toLowerCase() === 'presencial' ? 'presencial' : 
                       eventoEncontrado.ModalidadeNome?.toLowerCase() === 'online' ? 'online' : 'presencial',
            tipo_evento: eventoEncontrado.InstrumentoNome || 'Evento',
            publico_alvo: eventoEncontrado.TipoPublico === 'Aberto' ? 'Público geral' : 'Público específico',
            gerente: '',
            coordenador: '',
            solucao: eventoEncontrado.DescProjeto || 'Sistema SAS',
            unidade: eventoEncontrado.DescUnidadeOrganizacional || 'SEBRAE-RR',
            tipo_acao: eventoEncontrado.DescAcao || 'Capacitação',
            status: eventoEncontrado.Situacao === 'Disponível' ? 'active' : 'inactive',
            meta_participantes: parseInt(eventoEncontrado.MaxParticipante) || 100,
            carga_horaria: parseFloat(eventoEncontrado.CargaHoraria) || 0,
            vagas_disponiveis: parseInt(eventoEncontrado.VagasDisponiveis) || 0,
            minimo_participantes: parseInt(eventoEncontrado.MinParticipante) || 0,
            maximo_participantes: parseInt(eventoEncontrado.MaxParticipante) || 0,
            preco: parseFloat(eventoEncontrado.Preco) || 0,
            gratuito: eventoEncontrado.EventoGratuito === '1',
            frequencia_minima: parseInt(eventoEncontrado.FrequenciaMin) || 0,
            instrumento: eventoEncontrado.InstrumentoNome || '',
            modalidade_id: parseInt(eventoEncontrado.ModalidadeID) || 0,
            codigo_projeto: eventoEncontrado.CodProjeto || '',
            codigo_acao: parseInt(eventoEncontrado.CodAcao) || 0,
            codigo_produto: parseInt(eventoEncontrado.CodProduto) || 0,
            total_dias_evento: parseInt(eventoEncontrado.TotalDiasEvento) || 1,
            data_inclusao_sas: eventoEncontrado.DataInclusao ? new Date(eventoEncontrado.DataInclusao).toISOString() : null,
            data_ultima_alteracao_sas: eventoEncontrado.DataUltimaAlteracao ? 
                parseBrazilianDate(eventoEncontrado.DataUltimaAlteracao) : null,
            observacoes: `Evento importado do SAS em ${new Date().toLocaleString('pt-BR')}.
            
Detalhes do SAS:
- Código: ${eventoEncontrado.CodEvento}
- Produto: ${eventoEncontrado.DescProduto}
- Projeto: ${eventoEncontrado.DescProjeto}
- Instrumento: ${eventoEncontrado.InstrumentoNome}
- Modalidade: ${eventoEncontrado.ModalidadeNome}
- Carga Horária: ${eventoEncontrado.CargaHoraria}h
- Tipo Público: ${eventoEncontrado.TipoPublico}
- Gratuito: ${eventoEncontrado.EventoGratuito === '1' ? 'Sim' : 'Não'}
- Vagas: ${eventoEncontrado.MinParticipante} a ${eventoEncontrado.MaxParticipante} participantes
- Preço: R$ ${eventoEncontrado.Preco}
- Situação: ${eventoEncontrado.Situacao}`,
            rawData: eventoEncontrado
        };

        return res.status(200).json({
            message: 'Evento encontrado com sucesso',
            evento: eventoFormatado,
            debug: {
                anosTestados: anosParaTestar,
                anoEncontrado: eventoEncontrado.DataEvento ? new Date(eventoEncontrado.DataEvento).getFullYear() : 'Desconhecido'
            }
        });

    } catch (error) {
        console.error('Erro geral ao buscar evento SAS:', error);
        return res.status(500).json({
            message: 'Erro interno ao buscar evento no SAS',
            error: error.message
        });
    }
}