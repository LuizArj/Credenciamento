import { getToken, getUserInfo, isAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifica se existe um token válido
    const token = await getToken();
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Obtém informações do usuário
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Para acesso ao painel admin, verifica se é admin
    if (req.url.startsWith('/api/admin/')) {
      const admin = await isAdmin();
      if (!admin) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    // Retorna informações do usuário
    return res.status(200).json({
      user: {
        name: userInfo.name,
        email: userInfo.username,
        roles: userInfo.roles
      }
    });
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}