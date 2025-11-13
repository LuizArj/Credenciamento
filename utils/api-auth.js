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

      // Verificar se tem as permissões necessárias
      const userRoles = session.user?.roles || [];

      // Se requiredPermissions for um objeto (mapeamento por método HTTP)
      if (typeof requiredPermissions === 'object' && !Array.isArray(requiredPermissions)) {
        const methodPermissions = requiredPermissions[req.method];

        // Se não há permissões definidas para este método, permitir acesso
        if (!methodPermissions || methodPermissions.length === 0) {
          return await handler(req, res);
        }

        // Admin tem todas as permissões
        if (userRoles.includes('admin')) {
          return await handler(req, res);
        }

        // Verificar permissões específicas do método
        const hasPermission = methodPermissions.some((permission) => {
          switch (permission) {
            case 'admin_only':
              return userRoles.includes('admin');
            case 'manage_users':
            case 'users.manage':
            case 'roles.manage':
            case 'permissions.manage':
              return userRoles.includes('admin');
            case 'events.manage':
            case 'manage_events':
              return userRoles.includes('admin') || userRoles.includes('manager');
            case 'events.view':
            case 'view_reports':
              // Qualquer usuário autenticado pode visualizar eventos
              return true;
            case 'participants.manage':
            case 'manage_participants':
              // Qualquer usuário autenticado pode gerenciar participantes
              return true;
            default:
              return false;
          }
        });

        if (!hasPermission) {
          console.log('Acesso negado. Permissões insuficientes.');
          return res.status(403).json({
            error: 'Sem permissão',
            message: 'Você não tem as permissões necessárias para acessar este recurso',
          });
        }

        return await handler(req, res);
      }

      // Se for array de permissões (formato antigo)
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [];

      // Se não há permissões requeridas (array vazio), permite acesso a todos autenticados
      if (permissions.length === 0) {
        return await handler(req, res);
      }

      // Admin tem todas as permissões
      if (userRoles.includes('admin')) {
        return await handler(req, res);
      }

      // Verificar permissões específicas
      const hasPermission = permissions.some((permission) => {
        switch (permission) {
          case 'admin_only':
            return userRoles.includes('admin');
          case 'manage_users':
            return userRoles.includes('admin');
          case 'manage_events':
            return userRoles.includes('admin') || userRoles.includes('manager');
          case 'view_reports':
            // Qualquer usuário autenticado pode visualizar relatórios
            return true;
          case 'manage_participants':
            // Qualquer usuário autenticado pode gerenciar participantes
            return true;
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
          message: 'Você não tem as permissões necessárias para acessar este recurso',
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
