import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Verificar se o usuário tem permissão de gerenciar usuários
    const userRoles = session.user.roles || [];
    const hasPermission = userRoles.includes('admin') || userRoles.includes('manager');
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Sem permissão para listar roles' });
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
    const { data: roles, error } = await supabaseAdmin
      .from('credenciamento_admin_roles')
      .select('id, name, description')
      .order('name');

    if (error) {
      console.error('Erro ao buscar roles:', error);
      throw error;
    }

    return res.status(200).json(roles);
  } catch (error) {
    console.error('Erro ao buscar roles:', error);
    return res.status(500).json({ message: 'Erro ao buscar roles' });
  }
}