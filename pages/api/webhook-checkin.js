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

    // Disparar chamada ao N8N e responder imediatamente (fire-and-forget)
    fetch(process.env.N8N_WEBHOOK_CHECKIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData),
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => '');
          console.error('Webhook check-in notification failed:', r.status, r.statusText, body);
        } else {
          const result = await r.json().catch(() => ({}));
          if (result && (result.retorno || result.message)) {
            console.log('Retorno do N8N (webhook-checkin):', result.retorno || result.message);
          }
        }
      })
      .catch((err) => console.error('Erro ao chamar webhook de check-in:', err));

    return res.status(200).json({
      success: true,
      message: 'Dados enviados para webhook de check-in (processamento em segundo plano)',
    });
  } catch (error) {
    console.error('Error sending webhook check-in notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar dados para o sistema de check-in',
      error: error.message,
    });
  }
}
