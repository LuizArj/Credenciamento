// pages/api/ticket-categories.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ message: 'O ID do evento é obrigatório.' });
  }

  try {
    const response = await fetch(`https://api.4.events/tickets/${eventId}/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FOUR_EVENTS_CLIENT_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error('Erro da API 4.events ao buscar categorias de ingresso:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Resposta de erro completa:', errorText);
      return res.status(500).json({ 
        message: 'Erro ao buscar categorias de ingresso',
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('Resposta da API 4.events para categorias de ingresso:', data);

    // --- NOVA LÓGICA: Tratamento da resposta da API ---
    let categories = [];
    
    if (Array.isArray(data)) {
      categories = data;
    } else if (data.result && Array.isArray(data.result)) {
      categories = data.result; // Este é o formato correto baseado nos logs
    } else if (data.categories && Array.isArray(data.categories)) {
      categories = data.categories;
    } else if (data.data && Array.isArray(data.data)) {
      categories = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      categories = data.results;
    } else {
      console.warn('Estrutura de resposta inesperada para categorias de ingresso:', data);
      categories = [];
    }

    // --- FILTRO: Apenas ingressos com periodo_atual = 1 (ativos) ---
    const activeCategories = categories.filter(category => category.periodo_atual === 1);
    
    console.log('Categorias antes do filtro:', categories.length);
    console.log('Categorias após filtro (periodo_atual = 1):', activeCategories.length);

    // --- FORMATAÇÃO: Transformar categorias para o formato esperado ---
    const formattedCategories = activeCategories.map(category => ({
      id: category.id,
      name: category.nome,
      price: parseFloat(category.valor_lote_atual || category.valor_1 || 0),
      description: category.status_label || '',
      available: category.status === 1,
      periodo_atual: category.periodo_atual, // Manter para debug
      vagas: parseInt(category.vagas || 0),
      lote_atual: category.lote_atual,
      status_label: category.status_label,
    }));

    return res.status(200).json(formattedCategories);
  } catch (error) {
    console.error('Erro interno na API de categorias de ingresso:', error);
    return res.status(500).json({ 
      message: 'Erro interno na API de categorias de ingresso',
      error: error.message 
    });
  }
}