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
      case 'GET':
        return await getRoles(req, res);
      
      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao listar roles:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

async function getRoles(req, res) {
  try {
    const { rows: roles } = await query('SELECT id, name, description FROM credenciamento_admin_roles ORDER BY name');
    return res.status(200).json(roles);
  } catch (error) {
    console.error('Erro ao buscar roles:', error);
    return res.status(500).json({ message: 'Erro ao buscar roles' });
  }
}