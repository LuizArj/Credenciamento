import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const apiUrl = `https://api.4.events/events/list`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error("Erro da API 4.events ao buscar eventos:", await response.text());
      throw new Error('Falha ao buscar a lista de eventos.');
    }

    const data = await response.json();

    // --- CORREÇÃO PRINCIPAL AQUI ---
    // 1. Acessamos 'data.result' em vez de 'data.data'.
    // 2. Filtramos apenas os eventos ativos.
    // 3. Mapeamos 'event_id' para 'id' e 'event_name' para 'name'.
    if (data && data.result) {
      const events = data.result
        .filter(event => event.active === "1") // Filtra apenas eventos ativos 
        .map(event => ({
          id: event.event_id,       // Corrigido de 'id' para 'event_id' 
          name: event.event_name,     // Corrigido de 'name' para 'event_name' 
        }));
      
      res.status(200).json(events);
    } else {
      throw new Error('A resposta da API de eventos não continha a lista de resultados esperada.');
    }
    // --- FIM DA CORREÇÃO ---

  } catch (error) {
    console.error("Erro interno na API de eventos:", error);
    res.status(500).json({ message: error.message });
  }
}