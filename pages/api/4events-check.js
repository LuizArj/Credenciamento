export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { cpf, eventId } = req.body;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_4EVENTS_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FOUR_EVENTS_CLIENT_TOKEN}`,
      },
      body: JSON.stringify({
        event_id: eventId,
        cpf: cpf.replace(/\D/g, ''),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        isRegistered: true,
        participant: {
          name: data.name,
          email: data.email,
          cpf: cpf,
        },
      });
    }

    return res.status(200).json({ isRegistered: false });
  } catch (error) {
    console.error('Error checking 4.events registration:', error);
    return res.status(500).json({ message: 'Erro ao verificar inscrição' });
  }
}
