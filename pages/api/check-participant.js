// DEPRECATED: Legacy 4.events participant check. Not used by current flow.
// Returns 410 Gone to prevent stale calls.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    success: false,
    error: 'gone',
    message: 'Endpoint /api/check-participant foi descontinuado.',
  });
}
