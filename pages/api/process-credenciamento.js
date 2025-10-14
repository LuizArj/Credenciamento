// DEPRECATED: This endpoint is no longer used. Use /api/webhook-checkin instead.
// Returning 410 Gone to signal deprecation and avoid duplicate webhook sends.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    success: false,
    error: 'gone',
    message:
      'Endpoint /api/process-credenciamento foi descontinuado. Utilize /api/webhook-checkin e/ou /api/register-local-credenciamento.',
    next: ['/api/webhook-checkin', '/api/register-local-credenciamento'],
  });
}
