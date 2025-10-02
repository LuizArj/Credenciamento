export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, phone, cpf, company, vinculo, eventId, ticketId } = req.body;

    // Validação básica
    if (!eventId || !name || !email) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios: eventId, name, email' 
      });
    }

    // Preparar os parâmetros de query conforme a documentação da API
    const queryParams = new URLSearchParams({
      email: email,
      name: name,
      password: cpf?.replace(/\D/g, '') || '123456', // Usar CPF como senha ou padrão
      cpf: cpf?.replace(/\D/g, '') || '',
      created_by: 'admin',
      payment_active: '0', // 0 = inativo, 1 = ativo
      status: '1', // 1 = ativo
    });

    // Adicionar parâmetros opcionais se existirem
    if (phone) queryParams.append('phone', phone);
    if (ticketId) queryParams.append('ticket_category', ticketId);

    const response = await fetch(`https://api.4.events/attendees/${eventId}/new?${queryParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FOUR_EVENTS_CLIENT_TOKEN}`,
      },
    });

    console.log('4.events register response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('4.events register error:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      throw new Error(errorData.message || `Erro HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('4.events register success:', data);
    
    return res.status(200).json({
      success: true,
      registrationId: data.id || data.attendee_id,
      message: 'Participante registrado com sucesso no 4.events',
      data: data
    });
  } catch (error) {
    console.error('Error registering in 4.events:', error);
    return res.status(500).json({ 
      message: error.message,
      error: 'Erro ao registrar participante no 4.events'
    });
  }
}
