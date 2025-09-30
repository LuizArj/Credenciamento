import type { Database } from './database.types.ts'

export type LocalUser = Database['public']['Tables']['credenciamento_admin_users']['Row']
export type Role = Database['public']['Tables']['roles']['Row']
export type Permission = Database['public']['Tables']['permissions']['Row']
export type RolePermission = Database['public']['Tables']['role_permissions']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']

export interface UserWithRoles {
    id: string;
    username: string;
    password?: string;
    name: string;
    email: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
    roles: Role[];
}

export interface RoleWithPermissions extends Role {
    permissions: Permission[]
}

// Tipos de retorno das funções
export interface ApiResponse<T = any> {
    data?: T
    error?: string
    status?: number
}

// Funções de autenticação
export interface LoginCredentials {
    username: string
    password: string
}

export interface AuthResponse extends ApiResponse {
    data?: {
        user: UserWithRoles
        token: string
    }
}

// Funções de usuário
export interface CreateUserData {
    username: string
    password: string
    name: string
    email?: string
    roles: string[] // Array de IDs de roles
}