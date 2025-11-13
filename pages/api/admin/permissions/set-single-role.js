import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withTransaction } from '../../../../lib/config/database';

/**
 * API endpoint to set a single role for a user (removes all other roles)
 * Ensures users can only have ONE profile at a time
 *
 * @param {Object} req.body - Request body
 * @param {string} req.body.userId - User ID
 * @param {string} req.body.roleId - Role ID to assign
 */
export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

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

    const { userId, roleId } = req.body;

    // Validar parâmetros
    if (!userId || !roleId) {
      return res.status(400).json({ message: 'userId e roleId são obrigatórios' });
    }

    // Executar em transação para garantir consistência
    await withTransaction(async (client) => {
      // 1. Remover TODAS as roles do usuário
      await client.query('DELETE FROM credenciamento_admin_user_roles WHERE user_id = $1', [
        userId,
      ]);

      // 2. Adicionar APENAS a nova role selecionada
      await client.query(
        'INSERT INTO credenciamento_admin_user_roles (user_id, role_id, created_at) VALUES ($1, $2, NOW())',
        [userId, roleId]
      );
    });

    return res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso. Usuário agora tem apenas um perfil.',
    });
  } catch (error) {
    console.error('Erro ao definir perfil único:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: error.message,
    });
  }
}
