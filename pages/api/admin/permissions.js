import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/config/database';

export default async function handler(req, res) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Verificar se o usuário tem permissão de admin
    const userRoles = session.user.roles || [];
    const hasPermission = userRoles.includes('admin');
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Acesso restrito a administradores' });
    }

    switch (req.method) {
      case 'PUT':
        return await updateUserRole(req, res);
      
      default:
        res.setHeader('Allow', ['PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro no gerenciamento de permissões:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

async function updateUserRole(req, res) {
  const { userId, roleId, hasRole } = req.body;

  if (!userId || !roleId || typeof hasRole !== 'boolean') {
    return res.status(400).json({ message: 'Parâmetros inválidos' });
  }

  try {
    if (hasRole) {
      // Inserir com upsert (ON CONFLICT DO NOTHING)
      await query(
        'INSERT INTO credenciamento_admin_user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT (user_id, role_id) DO NOTHING',
        [userId, roleId]
      );
    } else {
      await query('DELETE FROM credenciamento_admin_user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);
    }

    return res.status(200).json({ message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    return res.status(500).json({ message: 'Erro ao atualizar permissões' });
  }
}