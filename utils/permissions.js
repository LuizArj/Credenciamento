// Mapeamento de permissões por role
const rolePermissions = {
  admin: [
    'manage_users',
    'manage_events',
    'manage_participants',
    'view_logs',
    'manage_settings'
  ],
  manager: [
    'manage_events',
    'manage_participants',
    'view_logs'
  ],
  operator: [
    'manage_participants'
  ]
};

// Verifica se o usuário tem uma permissão específica
export function hasPermission(userRoles, permission) {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  
  // Admin tem todas as permissões
  if (userRoles.includes('admin')) return true;
  
  // Verifica se alguma das roles do usuário tem a permissão
  return userRoles.some(role => 
    rolePermissions[role]?.includes(permission)
  );
}

// Verifica se o usuário tem alguma das permissões fornecidas
export function hasAnyPermission(userRoles, permissions) {
  return permissions.some(permission => hasPermission(userRoles, permission));
}

// Verifica se o usuário tem todas as permissões fornecidas
export function hasAllPermissions(userRoles, permissions) {
  return permissions.every(permission => hasPermission(userRoles, permission));
}

// Hook para proteger rotas baseado em permissões
export function requirePermissions(session, permissions) {
  // Se não há sessão ou usuário, não tem permissão
  if (!session?.user) return false;

  const userRoles = session.user.roles || [];
  
  // Se o usuário é admin, tem acesso a tudo
  if (userRoles.includes('admin')) return true;

  // Se não é admin, verifica se tem pelo menos uma das permissões necessárias
  return hasAnyPermission(userRoles, permissions);
}