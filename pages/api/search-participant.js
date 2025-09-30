import { getCpeToken } from '../../utils/cpe-auth';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { cpf } = req.body;
    if (!cpf) {
        return res.status(400).json({ message: 'CPF é obrigatório' });
    }

    try {
        
        // Primeiro, busca no SAS
        let sasData;
        try {
            sasData = await searchInSAS(cpf);
        } catch (sasError) {
            // Não retorna erro aqui, continua para tentar o CPE
        }
        
        // Se encontrou dados no SAS e estão completos
        if (sasData && !isIncompleteData(sasData)) {
            const formattedData = formatSASData(sasData);
            console.log('Retornando dados completos do SAS');
            return res.status(200).json(formattedData);
        }

        // Se os dados do SAS são nulos ou incompletos, tentar CPE
        if (!sasData || isIncompleteData(sasData)) {
            console.log('Dados do SAS não encontrados ou incompletos, tentando CPE');
            try {
                const cpeData = await searchInCPE(cpf);
                if (cpeData) {
                    console.log('Dados encontrados no CPE');
                    const formattedData = {
                        source: 'cpe', // Definindo explicitamente como CPE
                        cpf: cpeData.cpf,
                        name: cpeData.nome,
                        email: cpeData.comunicacoes?.find(c => c.tipoComunicacao.id === 25)?.comunicacao || '',
                        phone: cpeData.comunicacoes?.find(c => c.tipoComunicacao.id === 5)?.comunicacao || '',
                        rawData: cpeData,
                        __sourceVerified: 'cpe' // Campo adicional para garantir a fonte
                    };
                    return res.status(200).json(formattedData);
                }
            } catch (cpeError) {
                console.error('Erro na busca do CPE:', cpeError);
                // Se temos dados do SAS, mesmo incompletos, retorna eles
                if (sasData) {
                    console.log('Erro no CPE, retornando dados disponíveis do SAS');
                    return res.status(200).json(formatSASData(sasData));
                }
                throw cpeError;
            }

            // Se não encontrou em nenhum lugar
            return res.status(404).json({
                message: 'Participante não encontrado',
                fallbackUrl: process.env.NEXT_PUBLIC_FALLBACK_URL
            });
        }
    } catch (error) {
        console.error('Erro ao buscar participante:', error);
        return res.status(500).json({
            message: 'Erro ao buscar dados do participante',
            error: error.message
        });
    }
}

async function searchInSAS(cpf) {
    try {
        const cleanCpf = cpf.replace(/\D/g, '');
        console.log('Buscando no SAS - CPF:', cleanCpf);
        
        // A URL base já deve incluir /SasServiceCliente/Cliente do .env
        const url = `${process.env.NEXT_PUBLIC_SEBRAE_API_URL}/SelecionarPessoaFisica`;
        const params = new URLSearchParams({
            CgcCpf: cleanCpf
        });

        const fullUrl = `${url}?${params.toString()}`;
        console.log('URL completa:', fullUrl);
        console.log('URL do SAS:', fullUrl);
        
        const headers = {
            'Content-Type': 'application/json',
            'x-req': process.env.SEBRAE_API_KEY
        };
        
        console.log('Headers enviados:', headers);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: headers
        });

        console.log('Status da resposta:', response.status);
        console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('=== INÍCIO DA RESPOSTA BRUTA DO SAS ===');
        console.log(responseText);
        console.log('=== FIM DA RESPOSTA BRUTA DO SAS ===');

        let data;
        try {
            data = JSON.parse(responseText);
            console.log('=== DADOS PARSEADOS DO SAS ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('=== FIM DOS DADOS PARSEADOS ===');
        } catch (e) {
            console.error('Erro ao fazer parse da resposta:', e);
            throw new Error('Resposta inválida do SAS: ' + responseText);
        }

        if (!response.ok) {
            console.error('Resposta de erro do SAS:', {
                status: response.status,
                statusText: response.statusText,
                body: data
            });
            
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Erro na API do SAS: ${response.status} - ${JSON.stringify(data)}`);
        }

        if (Array.isArray(data) && data.length === 0) {
            console.log('SAS retornou array vazio - considerando como não encontrado');
            return null;
        }

        return data;
    } catch (error) {
        console.error('Erro ao buscar no SAS:', error);
        throw error;
    }
}

async function searchInCPE(cpf) {
    try {
        const token = await getCpeToken();
        const cleanCpf = cpf.replace(/\D/g, '');
        console.log('Buscando no CPE - CPF:', cleanCpf);

        const url = `https://api-gateway.sebrae.com.br/cpe/v1/pessoa-fisica?cpf=${cleanCpf}`;
        console.log('URL do CPE:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Resposta de erro do CPE:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Erro na API do CPE: ${response.status} - ${errorText || response.statusText}`);
        }

        const data = await response.json();
        console.log('Dados recebidos do CPE:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Erro ao buscar no CPE:', error);
        throw error;
    }
}

function isIncompleteData(sasData) {
    if (!sasData || (Array.isArray(sasData) && sasData.length === 0)) {
        console.log('SAS: Dados inexistentes ou vazios');
        return true;
    }
    
    const cliente = Array.isArray(sasData) ? sasData[0] : sasData;
    if (!cliente) {
        console.log('SAS: Cliente não encontrado');
        return true;
    }

    // Se encontrou no SAS e está ativo, retorna false (não está incompleto)
    const isActive = cliente.Situacao === 1;

    console.log('SAS: Verificação de dados:', {
        isActive,
        situacao: cliente.Situacao
    });

    // Só considera incompleto se não estiver ativo
    return !isActive;
}

function formatSASData(sasData) {
    if (!sasData) {
        console.log('SAS: Dados não fornecidos');
        return null;
    }

    // Se os dados vierem em um array, pega o primeiro item
    const cliente = Array.isArray(sasData) ? sasData[0] : sasData;
    
    console.log('SAS: Dados do cliente encontrado:', cliente);

    // Buscar email e telefone da lista de contatos
    const contatos = cliente.ListaInformacoesContato || [];
    const email = contatos.find(c => c.CodComunic === 25)?.Numero || '';
    const phone = contatos.find(c => c.CodComunic === 5)?.Numero || '';

    // Procurar vínculo principal ou pegar o primeiro
    const vinculos = cliente.ListaVinculo || [];
    const vinculoPrincipal = vinculos.find(v => v.IndPrincipal === 1) || vinculos[0];

    const formatted = {
        source: 'sas',
        cpf: cliente.CgcCpf?.toString() || '',
        name: cliente.NomeRazaoSocial || '',
        email: email,
        phone: phone,
        situacao: cliente.Situacao === 1 ? 'Ativo' : 'Inativo',
        rawData: cliente,
        // Dados de empresa vinculada
        company: vinculoPrincipal ? {
            cnpj: vinculoPrincipal.CgcCpf?.toString() || '',
            razaoSocial: vinculoPrincipal.NomeRazaoSocialPJ || '',
            cargo: vinculoPrincipal.DescCargCli || ''
        } : null,
        // Lista completa de vínculos para seleção posterior
        ListaVinculo: vinculos
    };

    console.log('SAS: Dados formatados:', formatted);
    return formatted;
}

