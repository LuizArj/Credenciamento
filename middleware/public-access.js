// Constantes para as rotas que não requerem autenticação
const PUBLIC_ROUTES = [
  '/credenciamento-sas',
  '/credenciamento-4events',
  '/qrcode-sebrae'
];

export function withPublicAccess(handler) {
  return async (req, res) => {
    // Verifica se a rota atual está na lista de rotas públicas
    const isPublicRoute = PUBLIC_ROUTES.some(route => req.url.startsWith(route));
    
    if (isPublicRoute) {
      // Se for uma rota pública, permite o acesso sem verificação
      return handler(req, res);
    }

    // Se não for uma rota pública, aplica as regras normais de autenticação
    return withAuth(handler)(req, res);
  };
}