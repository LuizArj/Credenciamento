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
      return res.status(403).json({ message: 'Sem permissão para gerenciar usuários' });
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
      // Adicionar role ao usuário (se não existir)
      const { error } = await supabaseAdmin
        .from('credenciamento_admin_user_roles')
        .upsert(
          { user_id: userId, role_id: roleId },
          { onConflict: 'user_id,role_id' }
        );

      if (error) {
        console.error('Erro ao adicionar role:', error);
        throw error;
      }
    } else {
      // Remover role do usuário
      const { error } = await supabaseAdmin
        .from('credenciamento_admin_user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) {
        console.error('Erro ao remover role:', error);
        throw error;
      }
    }

    return res.status(200).json({ message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    return res.status(500).json({ message: 'Erro ao atualizar permissões' });
  }
}