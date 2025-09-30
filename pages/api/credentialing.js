// pages/api/credentialing.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const completeParticipantData = req.body; // Recebe o payload completo
  const eventId = process.env.NEXT_PUBLIC_4EVENTS_EVENT_ID;

  try {
    const formData = new FormData();
    formData.append('email', completeParticipantData.email);
    formData.append('name', completeParticipantData.name);
    // ... (outros campos para 4.events)
    formData.append('cpf', completeParticipantData.cpf);
    formData.append('phone', completeParticipantData.phone);
    formData.append('password', Math.random().toString(36).slice(-8));
    formData.append('ticket_allotment', '1');
    formData.append('ticket_category', '7');
    formData.append('status', '1');
    formData.append('payment_active', '1');

    const fourEventsUrl = `${process.env.NEXT_PUBLIC_4EVENTS_API_URL}/${eventId}/new`;
    const response = await fetch(fourEventsUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.FOUR_EVENTS_CLIENT_TOKEN}` },
      body: formData,
    });
    const fourEventsResponseData = await response.json();
    if (!response.ok || !fourEventsResponseData.success) {
      throw new Error(fourEventsResponseData.message || 'A API 4.events indicou uma falha no cadastro.');
    }
    console.log("Inscrição na 4.events confirmada com sucesso.");
  } catch (error) {
    console.error("Erro no passo de inscrição:", error.message);
    return res.status(500).json({ message: error.message });
  }

  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completeParticipantData), // Envia o payload completo
    });
    console.log("Webhook N8N acionado com sucesso com payload enriquecido.");
  } catch (error) {
    console.error("Falha ao acionar o webhook N8N:", error.message);
  }

  return res.status(200).json({ message: 'Credenciamento concluído!' });
}