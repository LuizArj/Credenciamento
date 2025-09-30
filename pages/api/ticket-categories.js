// pages/api/ticket-categories.js
export default async function handler(req, res) {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ message: 'O ID do evento é obrigatório.' });
  }

  // --- CORREÇÃO 1: URL ajustada para o endpoint correto de tickets ---
  const apiUrl = `https://api.4.events/tickets/${eventId}/list`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.FOUR_EVENTS_CLIENT_TOKEN}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error("Erro da API 4.events ao buscar ingressos:", await response.text());
      throw new Error('Falha ao buscar os tipos de ingresso para este evento.');
    }

    const data = await response.json();

    if (data && data.result) {
      // --- CORREÇÃO 2: Lógica de filtro e mapeamento ajustada ---
      const ticketCategories = data.result
        .filter(ticket => ticket.status_label === "Ativo" && ticket.oculta_label === "Categoria visível") // Filtra apenas ingressos úteis
        .map(ticket => ({
          id: ticket.id,         // Campo 'id' está correto
          name: ticket.nome,       // Corrigido de 'name' para 'nome'
        }));
      
      res.status(200).json(ticketCategories);
    } else {
      throw new Error('A resposta da API de ingressos não continha a lista de resultados esperada.');
    }
    // --- FIM DAS CORREÇÕES ---

  } catch (error) {
    console.error("Erro interno na API de ingressos:", error);
    res.status(500).json({ message: error.message });
  }
}