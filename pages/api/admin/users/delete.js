import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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
      return res.status(403).json({ message: 'Sem permissão para excluir usuários' });
    }

    if (req.method !== 'DELETE') {
      res.setHeader('Allow', ['DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { userId } = req.body;

    // Validações
    if (!userId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabaseAdmin
      .from('credenciamento_admin_users')
      .select('id, username, password')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return res.status(500).json({ message: 'Erro ao buscar usuário' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se é um usuário local (não Keycloak)
    if (user.password === 'KEYCLOAK_USER') {
      return res.status(400).json({ 
        message: 'Não é possível excluir usuários Keycloak através desta interface' 
      });
    }

    // Verificar se não está tentando excluir seu próprio usuário
    if (session.user.id === userId) {
      return res.status(400).json({ 
        message: 'Não é possível excluir seu próprio usuário' 
      });
    }

    // Iniciar transação para remover usuário e suas relações
    try {
      // Primeiro, remover as associações de roles
      const { error: rolesError } = await supabaseAdmin
        .from('credenciamento_admin_user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Erro ao remover roles do usuário:', rolesError);
        throw rolesError;
      }

      // Depois, remover o usuário
      const { error: deleteError } = await supabaseAdmin
        .from('credenciamento_admin_users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('Erro ao excluir usuário:', deleteError);
        throw deleteError;
      }

      // Log da ação para auditoria
      console.log(`Admin ${session.user.username} excluiu o usuário ${user.username} (ID: ${userId})`);

      return res.status(200).json({ 
        message: 'Usuário excluído com sucesso',
        username: user.username
      });

    } catch (transactionError) {
      console.error('Erro na transação de exclusão:', transactionError);
      return res.status(500).json({ message: 'Erro ao excluir usuário e suas relações' });
    }

  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}