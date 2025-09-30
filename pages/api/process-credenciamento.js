export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { participant, eventDetails } = req.body;

    if (!participant || !eventDetails) {
        return res.status(400).json({
            message: 'Dados do participante e do evento são obrigatórios'
        });
    }

    try {
        // Enviar dados para o webhook do N8N
        const response = await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tipo: 'credenciamento_direto',
                participante: {
                    nome: participant.name,
                    email: participant.email,
                    telefone: participant.phone,
                    cpf: participant.cpf,
                    fonte: participant.source,
                },
                evento: {
                    id: eventDetails.id,
                    nome: eventDetails.nome,
                    dataInicio: eventDetails.dataInicio,
                    dataFim: eventDetails.dataFim,
                    local: eventDetails.local,
                    cidade: eventDetails.cidade,
                    uf: eventDetails.uf,
                },
                dadosOriginais: {
                    sas: participant.rawData,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Erro ao enviar para N8N: ${response.statusText}`);
        }

        const result = await response.json();
        return res.status(200).json({
            message: 'Participante credenciado com sucesso',
            data: result
        });

    } catch (error) {
        console.error('Erro no credenciamento:', error);
        return res.status(500).json({
            message: 'Erro ao processar o credenciamento',
            error: error.message
        });
    }
}