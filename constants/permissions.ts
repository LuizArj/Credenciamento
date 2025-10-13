/**
 * Permissions Constants
 * 
 * @description Permissões e roles do sistema
 * @version 1.0.0
 */

// ============================================================================
// ROLES
// ============================================================================

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ============================================================================
// PERMISSIONS
// ============================================================================

export const PERMISSIONS = {
  // User management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // Event management
  MANAGE_EVENTS: 'manage_events',
  VIEW_EVENTS: 'view_events',
  EXPORT_EVENTS: 'export_events',
  
  // Participant management
  MANAGE_PARTICIPANTS: 'manage_participants',
  VIEW_PARTICIPANTS: 'view_participants',
  EXPORT_PARTICIPANTS: 'export_participants',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  
  // System
  VIEW_LOGS: 'view_logs',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================================================
// ROLE PERMISSIONS MAPPING
// ============================================================================

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.EXPORT_EVENTS,
    PERMISSIONS.MANAGE_PARTICIPANTS,
    PERMISSIONS.VIEW_PARTICIPANTS,
    PERMISSIONS.EXPORT_PARTICIPANTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_LOGS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.EXPORT_EVENTS,
    PERMISSIONS.MANAGE_PARTICIPANTS,
    PERMISSIONS.VIEW_PARTICIPANTS,
    PERMISSIONS.EXPORT_PARTICIPANTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
  ],
  [ROLES.OPERATOR]: [
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.MANAGE_PARTICIPANTS,
    PERMISSIONS.VIEW_PARTICIPANTS,
    PERMISSIONS.VIEW_REPORTS,
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function hasPermission(userRoles: Role[], permission: Permission): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  
  // Admin has all permissions
  if (userRoles.includes(ROLES.ADMIN)) return true;
  
  // Check if any role has the permission
  return userRoles.some(role => 
    ROLE_PERMISSIONS[role]?.includes(permission)
  );
}

export function hasAnyPermission(userRoles: Role[], permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRoles, permission));
}

export function hasAllPermissions(userRoles: Role[], permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRoles, permission));
}
