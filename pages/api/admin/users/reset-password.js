import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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
      return res.status(403).json({ message: 'Sem permissão para redefinir senhas' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { userId, newPassword } = req.body;

    // Validações
    if (!userId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se o usuário existe e é um usuário local
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
        message: 'Não é possível redefinir a senha de usuários Keycloak através desta interface' 
      });
    }

    // Gerar hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar a senha no banco
    const { error: updateError } = await supabaseAdmin
      .from('credenciamento_admin_users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError);
      return res.status(500).json({ message: 'Erro ao atualizar senha' });
    }

    // Log da ação para auditoria
    console.log(`Admin ${session.user.username} redefiniu a senha do usuário ${user.username} (ID: ${userId})`);

    return res.status(200).json({ 
      message: 'Senha redefinida com sucesso',
      username: user.username
    });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}