// DEPRECATED: Legacy 4.events credentialing endpoint. Not used in current flow.
// Returns 410 Gone and points to the supported endpoints.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    success: false,
    error: 'gone',
    message:
      'Endpoint /api/credentialing foi descontinuado. Utilize /api/webhook-checkin e/ou /api/register-local-credenciamento.',
    next: ['/api/webhook-checkin', '/api/register-local-credenciamento'],
  });
}
