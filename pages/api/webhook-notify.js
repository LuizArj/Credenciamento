export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const webhookData = {
      ...req.body,
      timestamp: new Date().toISOString(),
      platform: '4events',
    };

    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      console.error('Webhook notification failed:', response.statusText);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending webhook notification:', error);
    return res.status(200).json({ success: true }); // Don't fail the process for webhook errors
  }
}
