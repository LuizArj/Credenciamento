import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const { cpf, eventId } = req.body;
  
  // --- CORREÇÃO 1: URL ajustada para o endpoint de busca correto ---
  const url = `https://api.4.events/attendees/${eventId}/search`;
  
  try {
    // --- CORREÇÃO 2: Usar FormData e método POST, como no cURL ---
    const formData = new FormData();
    formData.append('search_by', cpf.replace(/\D/g, ''));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      console.error("Erro da API 4.events na busca:", await response.text());
      throw new Error('Falha ao comunicar com a API 4.events');
    }

    const data = await response.json();
    
    // --- CORREÇÃO 3: Lógica para encontrar o primeiro participante ATIVO ---
    if (data && data.results && data.results.length > 0) {
      // Procura por um participante com status "1" (ativo)
      const activeParticipant = data.results.find(p => p.status === "1");

      if (activeParticipant) {
        // Se encontrou um ativo, retorna que ele já está registrado
        res.status(200).json({ 
          isRegistered: true, 
          participant: {
            // Mapeia os campos da resposta para o formato que nossa UI espera
            name: activeParticipant.attendee_name,
            email: activeParticipant.attendee_email,
          } 
        });
      } else {
        // Se encontrou registros, mas nenhum está ativo
        res.status(200).json({ isRegistered: false });
      }
    } else {
      // Se não encontrou nenhum registro
      res.status(200).json({ isRegistered: false });
    }
  } catch (error) {
    console.error("Erro interno na verificação de participante:", error);
    // Em caso de erro, assumimos que ele não está registrado para não bloquear o fluxo
    res.status(200).json({ isRegistered: false });
  }
}