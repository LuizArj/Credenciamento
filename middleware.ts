import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/api/auth', '/_next', '/favicon.ico', '/sebrae-logo-white.png'];

  // Verificar se a rota é pública
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Verificar se o usuário está autenticado usando next-auth JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Se não estiver autenticado, redirecionar para login
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Verificar permissões para rotas específicas de admin
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
    const roles = (token.roles as string[]) || [];
    
    // Operator não pode acessar módulo admin
    if (roles.includes('operator') && !roles.includes('admin') && !roles.includes('manager')) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/unauthorized';
      return NextResponse.redirect(url);
    }
    
    // Rotas que exigem role admin
    const adminOnlyRoutes = ['/api/admin/permissions', '/api/admin/users', '/api/admin/roles', '/admin/permissions'];
    const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));
    
    if (isAdminOnlyRoute && !roles.includes('admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/unauthorized';
      return NextResponse.redirect(url);
    }
    
    // Para outras rotas admin (eventos, participantes, dashboard)
    // Admin e Manager podem acessar
  }

  // Adicionar headers de segurança
  const response = NextResponse.next();

  // Cache de sessão - adiciona headers para otimizar verificação de autenticação
  response.headers.set('X-User-Authenticated', 'true');
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
