import { getToken, getUserInfo, isAdmin } from '../lib/auth';

export async function withAuth(handler) {
  return async (req, res) => {
    try {
      // Verifica se existe um token válido
      const token = await getToken();
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verifica se o usuário está autenticado
      const userInfo = await getUserInfo();
      if (!userInfo) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Para rotas administrativas, verifica se o usuário é admin
      if (req.url.startsWith('/api/admin/')) {
        const admin = await isAdmin();
        if (!admin) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      // Adiciona o userInfo ao request para uso posterior
      req.user = userInfo;
      
      return handler(req, res);
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}