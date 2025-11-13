import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export function withAdminProtection(WrappedComponent, requiredPermissions = ['manage_users']) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
      // Se está carregando, não faz nada
      if (status === 'loading') return;

      // Se não está autenticado, redireciona para login
      if (!session) {
        router.replace('/login');
        return;
      }

      // Verifica se a página requer permissão de administrador
      const requiresAdmin = requiredPermissions.includes('admin_only');
      const userRoles = session.user?.roles || [];
      const isAdmin = userRoles.includes('admin');

      // Se requer admin e usuário não é admin, redireciona
      if (requiresAdmin && !isAdmin) {
        router.replace('/admin/unauthorized');
        return;
      }
    }, [session, status, router, requiredPermissions]);

    // Enquanto verifica autenticação, mostra loading
    if (status === 'loading' || !session) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // Se estiver autenticado, renderiza o componente
    return <WrappedComponent {...props} />;
  };
}
