import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

// Middleware para proteger rotas da API
export function withApiAuth(handler, requiredPermissions = ['manage_users']) {
  return async function apiHandler(req, res) {
    try {
      const session = await getServerSession(req, res, authOptions);

      // Verifica se está autenticado
      if (!session) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      // Verifica se tem as permissões necessárias
      const userRoles = session.user?.roles || [];
      console.log('Roles do usuário:', userRoles);
      console.log('Permissões necessárias:', requiredPermissions);

      // Admin tem todas as permissões
      if (userRoles.includes('admin')) {
        console.log('Usuário é admin, permissão concedida');
        return await handler(req, res);
      }
        
      // Para outros roles, verifica as permissões específicas
      const hasPermission = requiredPermissions.some(permission => {
        switch(permission) {
          case 'manage_users':
            return userRoles.includes('admin');
          case 'manage_events':
            return userRoles.includes('admin') || userRoles.includes('manager');
          case 'view_reports':
            return userRoles.includes('admin') || userRoles.includes('manager');
          case 'manage_participants':
            return userRoles.includes('admin') || userRoles.includes('manager') || userRoles.includes('operator');
          default:
            return false;
        }
      });

      if (!hasPermission) {
        console.log('Acesso negado. Roles necessárias não encontradas.');
        return res.status(403).json({ 
          error: 'Sem permissão',
          userRoles,
          requiredPermissions,
          message: 'Você não tem as permissões necessárias para acessar este recurso'
        });
      }

      // Se passou pelas verificações, executa o handler
      return await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}