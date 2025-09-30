import { getCpeToken } from '../../utils/cpe-auth';
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { unformatCPF } from "../../utils/validators";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ message: "Não autenticado" });
    }

    const { cpf } = req.body;
    if (!cpf) {
        return res.status(400).json({ message: 'CPF é obrigatório' });
    }

    const unformattedCPF = unformatCPF(cpf);
    let participant4events = null;

    try {
        // Primeiro, tenta buscar na 4events
        const searchUrl = `https://api.4.events/attendees/search`;
        const searchFormData = new FormData();
        searchFormData.append('cpf', unformattedCPF);

        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Accept': 'application/json',
            },
            body: searchFormData,
        });

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.results && searchData.results.length > 0) {
                participant4events = searchData.results[0];
                return res.status(200).json({
                    cpf: unformattedCPF,
                    name: participant4events.attendee_name,
                    email: participant4events.attendee_email,
                    phone: participant4events.attendee_phone,
                    source: '4events',
                    rawData: participant4events,
                });
            }
        }
        
        console.log('Participante não encontrado na 4events, buscando em outras bases...');
        console.log('Iniciando busca para CPF:', cpf);
        
        // Primeiro, busca no SAS
        let sasData;
        try {
            sasData = await searchInSAS(cpf);
            console.log('Resposta do SAS:', 
                sasData && (!Array.isArray(sasData) || sasData.length > 0) 
                ? 'Encontrado' 
                : 'Não encontrado'
            );
        } catch (sasError) {
            console.error('Erro na busca do SAS:', sasError);
            // Não retorna erro aqui, continua para tentar o CPE
        }
        
        // Se encontrou dados no SAS e estão completos
        if (sasData && !isIncompleteData(sasData)) {
            const formattedData = formatSASData(sasData);
            console.log('Dados completos do SAS encontrados');
            
            // Criar participante na 4events com os dados do SAS
            await createParticipantIn4Events(session.accessToken, {
                cpf: unformattedCPF,
                name: formattedData.name,
                email: formattedData.email,
                phone: formattedData.phone
            });

            console.log('Retornando dados do SAS');
            return res.status(200).json(formattedData);
        }

        // Se não encontrou no SAS ou se os dados estão incompletos, busca no CPE
        console.log('Dados do SAS não encontrados ou incompletos, tentando CPE');
        try {
            const cpeData = await searchInCPE(cpf);
            if (cpeData) {
                console.log('Dados encontrados no CPE');
                const formattedData = {
                    source: 'cpe',
                    dataOrigin: 'cpe',
                    fromSystem: 'cpe',
                    cpf: cpeData.cpf,
                    name: cpeData.nome,
                    email: cpeData.comunicacoes?.find(c => c.tipoComunicacao?.id === 25)?.comunicacao || '',
                    phone: cpeData.comunicacoes?.find(c => c.tipoComunicacao?.id === 5)?.comunicacao || '',
                    rawData: cpeData
                };
                // Criar participante na 4events com os dados da CPE
                await createParticipantIn4Events(session.accessToken, {
                    cpf: formattedData.cpf,
                    name: formattedData.name,
                    email: formattedData.email,
                    phone: formattedData.phone
                });

                return res.status(200).json(formattedData);
            }
        } catch (cpeError) {
            console.error('Erro na busca do CPE:', cpeError);
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

        try {
            const data = JSON.parse(responseText);
            console.log('=== DADOS PARSEADOS DO SAS ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('=== FIM DOS DADOS PARSEADOS ===');

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

            // Se a resposta for null ou array vazio, retorna null
            if (data === null || (Array.isArray(data) && data.length === 0)) {
                console.log('SAS retornou dados vazios - considerando como não encontrado');
                return null;
            }

            return data;
        } catch (e) {
            console.error('Erro ao fazer parse da resposta:', e);
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar no SAS:', error);
        return null;
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
                'Content-Type': 'application/json'
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

    const isActive = cliente.Situacao === 1;
    console.log('SAS: Verificação de dados:', {
        isActive,
        situacao: cliente.Situacao
    });

    return !isActive;
}

async function createParticipantIn4Events(accessToken, data) {
    try {
        const createUrl = `https://api.4.events/attendees/create`;
        const createFormData = new FormData();
        createFormData.append('name', data.name);
        createFormData.append('email', data.email);
        createFormData.append('phone', data.phone);
        createFormData.append('cpf', data.cpf);

        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
            body: createFormData,
        });

        if (!createResponse.ok) {
            console.error('Falha ao criar participante na 4events:', await createResponse.text());
            throw new Error('Falha ao cadastrar participante na 4events');
        }

        const result = await createResponse.json();
        console.log('Participante criado na 4events:', result);
        return result;
    } catch (error) {
        console.error('Erro ao criar participante na 4events:', error);
        throw error;
    }
}

function formatSASData(sasData) {
    if (!sasData) {
        console.log('SAS: Dados não fornecidos');
        return null;
    }

    const cliente = Array.isArray(sasData) ? sasData[0] : sasData;
    console.log('SAS: Dados do cliente encontrado:', cliente);

    const contatos = cliente.ListaInformacoesContato || [];
    const email = contatos.find(c => c.CodComunic === 25)?.Numero || '';
    const phone = contatos.find(c => c.CodComunic === 5)?.Numero || '';

    const vinculos = cliente.ListaVinculo || [];
    const vinculoPrincipal = vinculos.find(v => v.IndPrincipal === 1) || vinculos[0];

    const formatted = {
        source: 'sas',
        dataOrigin: 'sas',
        fromSystem: 'sas',
        cpf: cliente.CgcCpf?.toString() || '',
        name: cliente.NomeRazaoSocial || '',
        email: email,
        phone: phone,
        situacao: cliente.Situacao === 1 ? 'Ativo' : 'Inativo',
        rawData: cliente,
        company: vinculoPrincipal ? {
            cnpj: vinculoPrincipal.CgcCpf?.toString() || '',
            razaoSocial: vinculoPrincipal.NomeRazaoSocialPJ || '',
            cargo: vinculoPrincipal.DescCargCli || ''
        } : null,
        ListaVinculo: vinculos
    };

    console.log('SAS: Dados formatados:', formatted);
    return formatted;
}