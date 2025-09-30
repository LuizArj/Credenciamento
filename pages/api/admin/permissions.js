import { getUserInfo, isAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    // Verifica se o usuário está autenticado e é admin
    const userInfo = await getUserInfo();
    if (!userInfo || !await isAdmin()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        // Retorna lista de usuários
        const users = await getUsers();
        return res.status(200).json(users);
      
      case 'PUT':
        // Atualiza permissões de um usuário
        const { userId, role, hasRole } = req.body;
        await updateUserRole(userId, role, hasRole);
        return res.status(200).json({ message: 'Success' });

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in permissions management:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Funções auxiliares para gerenciar usuários no Azure AD
async function getUsers() {
  try {
    const graphClient = await getGraphClient();
    const users = await graphClient.api('/users')
      .select('id,displayName,mail,userPrincipalName')
      .get();

    return users.value.map(user => ({
      id: user.id,
      name: user.displayName,
      email: user.mail || user.userPrincipalName,
      isAdmin: false // Implementar lógica para verificar role no Azure AD
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

async function updateUserRole(userId, role, hasRole) {
  try {
    const graphClient = await getGraphClient();
    if (hasRole) {
      await graphClient.api(`/users/${userId}/appRoleAssignments`)
        .post({
          principalId: userId,
          resourceId: process.env.AZURE_AD_CLIENT_ID, // Usando o Client ID como resource ID
          appRoleId: role === 'admin' ? process.env.AZURE_AD_ADMIN_ROLE_ID : null
        });
    } else {
      // Remover role
      const assignments = await graphClient.api(`/users/${userId}/appRoleAssignments`)
        .get();
      const assignment = assignments.value.find(a => 
        a.appRoleId === (role === 'admin' ? process.env.AZURE_AD_ADMIN_ROLE_ID : null)
      );
      if (assignment) {
        await graphClient.api(`/users/${userId}/appRoleAssignments/${assignment.id}`)
          .delete();
      }
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}