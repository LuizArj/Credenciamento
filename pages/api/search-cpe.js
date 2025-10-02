export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { cpf } = req.body;

  try {
    // Get CPE token
    const tokenResponse = await fetch('https://cpe.sebrae.com.br/auth/realms/cpe/protocol/openid-connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CPE_CLIENT_ID,
        client_secret: process.env.CPE_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get CPE token');
    }

    const tokenData = await tokenResponse.json();

    // Search participant in CPE
    const searchResponse = await fetch(`https://cpe.sebrae.com.br/api/v1/participants/search?cpf=${cpf}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!searchResponse.ok) {
      return res.status(404).json({ message: 'CPF não encontrado no CPE' });
    }

    const participantData = await searchResponse.json();
    
    return res.status(200).json({
      cpf: cpf,
      name: participantData.name || '',
      email: participantData.email || '',
      phone: participantData.phone || '',
      rawData: participantData,
    });
  } catch (error) {
    console.error('Error searching CPE:', error);
    return res.status(500).json({ message: 'Erro ao buscar no CPE' });
  }
}
