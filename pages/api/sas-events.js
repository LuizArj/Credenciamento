export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { 
            codEvento,          // Opcional
            periodoInicial,     // Obrigatório se não tiver mesAnoCompetencia
            periodoFinal,       // Obrigatório se não tiver mesAnoCompetencia
            situacao = 'D'      // Default 'D' para eventos disponíveis
        } = req.query;

        // Validar se tem pelo menos um dos parâmetros de período obrigatórios
        if (!periodoInicial || !periodoFinal) {
            return res.status(400).json({ 
                message: 'Período inicial e final são obrigatórios quando não se informa mês/ano de competência' 
            });
        }

        const apiUrl = 'https://sas.sebrae.com.br/SasServiceDisponibilizacoes/Evento/Consultar';
        
        // Parâmetros obrigatórios
        const queryParams = new URLSearchParams({
            CodSebrae: process.env.SEBRAE_COD_UF || '60', // Código da UF (exemplo: 14 para RR)
            Situacao: situacao,
            PeriodoInicial: periodoInicial,
            PeriodoFinal: periodoFinal,
        });

        // Adicionar parâmetros opcionais se fornecidos
        if (codEvento) {
            queryParams.append('CodEvento', codEvento);
        }

        const response = await fetch(`${apiUrl}?${queryParams}`, {
            headers: {
                'Content-Type': 'application/json',
                'x-req': process.env.SEBRAE_API_KEY
            },
        });

        if (!response.ok) {
            throw new Error(`Erro na API do SAS: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Log para debug
        console.log('Resposta da API do SAS:', data);

        // Formatar os dados do evento para o formato que precisamos
        const eventos = Array.isArray(data) ? data.map(evento => {
            // Log para debug de cada evento
            console.log('Evento original:', evento);
            
            return {
                id: evento.CodEvento,
                nome: evento.TituloEvento,
            };
        }) : [];

        return res.status(200).json(eventos);

    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        return res.status(500).json({
            message: 'Erro ao buscar eventos no SAS',
            error: error.message
        });
    }
}