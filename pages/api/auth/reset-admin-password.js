import bcrypt from 'bcryptjs';
import { query } from '../../../lib/config/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Gera o hash da nova senha
    const salt = await bcrypt.genSalt(6);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    console.log('Atualizando senha do admin...');

    // Atualiza a senha do usuário admin
    const { rows } = await query('UPDATE credenciamento_admin_users SET password = $1 WHERE username = $2 RETURNING id, username', [hashedPassword, 'admin']);
    const data = rows[0];
    if (!data) {
      return res.status(500).json({ error: 'Usuário admin não encontrado' });
    }

    console.log('Senha atualizada com sucesso:', { id: data.id, username: data.username, newPassword: 'admin123' });

    return res.status(200).json({ message: 'Senha atualizada com sucesso', user: { id: data.id, username: data.username } });

  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}