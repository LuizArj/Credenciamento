/**
 * Routes Constants
 * 
 * @description Rotas da aplicação
 * @version 1.0.0
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  
  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin',
    EVENTS: '/admin/events',
    PARTICIPANTS: '/admin/participants',
    PERMISSIONS: '/admin/permissions',
    UNAUTHORIZED: '/admin/unauthorized',
  },
  
  // Credenciamento routes
  CREDENCIAMENTO: {
    SAS: '/credenciamento-sas',
    FOUR_EVENTS: '/credenciamento-4events',
    QRCODE: '/qrcode-sebrae',
  },
  
  // API routes
  API: {
    AUTH: '/api/auth',
    EVENTS: '/api/admin/events',
    PARTICIPANTS: '/api/admin/participants',
    REPORTS: {
      EVENT: '/api/admin/events/[id]/report',
      PARTICIPANT: '/api/admin/participants/[id]/report',
    },
    EXPORT: {
      EVENT: '/api/admin/events/[id]/export',
      PARTICIPANT: '/api/admin/participants/[id]/export',
    },
    SAS: {
      FETCH_EVENT: '/api/sas/fetch-event',
      FETCH_PARTICIPANTS: '/api/sas/fetch-participants',
      SYNC: '/api/sas/sync',
    },
  },
  
  // Access control
  ACCESS_DENIED: '/access-denied',
} as const;

export type RouteKey = keyof typeof ROUTES;
