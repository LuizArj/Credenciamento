export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const webhookData = {
      ...req.body,
      timestamp: new Date().toISOString(),
      platform: 'credenciamento-sas',
    };

    const response = await fetch(process.env.N8N_WEBHOOK_CHECKIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      console.error('Webhook check-in notification failed:', response.statusText);
      throw new Error(`Erro ao enviar para webhook de check-in: ${response.statusText}`);
    }

    const result = await response.json().catch(() => ({})); // Handle non-JSON responses

    return res.status(200).json({ 
      success: true,
      message: 'Dados enviados para webhook de check-in com sucesso',
      data: result
    });
  } catch (error) {
    console.error('Error sending webhook check-in notification:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao enviar dados para o sistema de check-in',
      error: error.message
    });
  }
}