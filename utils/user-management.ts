import { supabase } from './supabase-client';
import bcrypt from 'bcryptjs';
import type { 
    LocalUser, 
    UserWithRoles, 
    CreateUserData, 
    ApiResponse,
    AuthResponse,
    Role
} from '../types/auth';

// ===== AUTENTICAÇÃO =====
export async function authenticateLocalUser(username: string, password: string): Promise<AuthResponse> {
    try {
        const { data: user, error } = await supabase
            .from('credenciamento_admin_users')
            .select(`
                *,
                user_roles (
                    role_id,
                    roles (
                        id,
                        name,
                        description
                    )
                )
            `)
            .eq('username', username)
            .single();

        if (error || !user) {
            return { error: 'Usuário não encontrado' };
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return { error: 'Senha incorreta' };
        }

        // Remove a senha do objeto de usuário
        const { password: _, ...userWithoutPassword } = user;
        
        // Estrutura as roles do usuário
        const roles = user.user_roles.map((ur: { roles: Role }) => ur.roles);

        return {
            data: {
                user: {
                    ...userWithoutPassword,
                    roles
                },
                token: 'local_auth' // Token local para diferenciar de auth do Keycloak
            }
        };
    } catch (error) {
        console.error('Erro na autenticação:', error);
        return { error: 'Erro ao autenticar usuário' };
    }
}

// ===== GERENCIAMENTO DE USUÁRIOS =====
export async function createLocalUser(userData: CreateUserData): Promise<ApiResponse<LocalUser>> {
    try {
        // Hash da senha
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Criar usuário
        const { data: user, error: userError } = await supabase
            .from('credenciamento_admin_users')
            .insert({
                username: userData.username,
                password: hashedPassword,
                name: userData.name,
                email: userData.email
            })
            .select()
            .single();

        if (userError) throw userError;

        // Associar roles
        if (userData.roles.length > 0) {
            const { error: rolesError } = await supabase
                .from('user_roles')
                .insert(
                    userData.roles.map(roleId => ({
                        user_id: user.id,
                        role_id: roleId
                    }))
                );

            if (rolesError) throw rolesError;
        }

        return { data: user };
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        return { error: 'Erro ao criar usuário' };
    }
}

export async function updateLocalUser(
    userId: string, 
    updates: Partial<CreateUserData>
): Promise<ApiResponse<LocalUser>> {
    try {
        const updateData: any = { ...updates };
        
        // Se tiver senha nova, fazer hash
        if (updates.password) {
            updateData.password = await bcrypt.hash(updates.password, 10);
        }

        // Atualizar usuário
        const { data: user, error: userError } = await supabase
            .from('credenciamento_admin_users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (userError) throw userError;

        // Se tiver roles novas, atualizar
        if (updates.roles) {
            // Remover roles antigas
            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId);

            // Adicionar roles novas
            const { error: rolesError } = await supabase
                .from('user_roles')
                .insert(
                    updates.roles.map(roleId => ({
                        user_id: userId,
                        role_id: roleId
                    }))
                );

            if (rolesError) throw rolesError;
        }

        return { data: user };
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        return { error: 'Erro ao atualizar usuário' };
    }
}

export async function deleteLocalUser(userId: string): Promise<ApiResponse> {
    try {
        const { error } = await supabase
            .from('credenciamento_admin_users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        return { data: true };
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        return { error: 'Erro ao deletar usuário' };
    }
}

export async function getLocalUsers(): Promise<ApiResponse<UserWithRoles[]>> {
    try {
        const { data: users, error } = await supabase
            .from('local_users')
            .select(`
                *,
                user_roles (
                    role_id,
                    roles (
                        id,
                        name,
                        description
                    )
                )
            `)
            .order('username');

        if (error) throw error;

        // Remove senhas e estrutura roles
        const usersWithRoles = users.map(user => {
            const { password: _, ...userWithoutPassword } = user;
            return {
                ...userWithoutPassword,
                roles: user.user_roles.map((ur: { roles: Role }) => ur.roles)
            };
        });

        return { data: usersWithRoles };
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return { error: 'Erro ao buscar usuários' };
    }
}

// Funções para buscar e verificar roles/permissões
export async function getUserRoles(userId: string): Promise<ApiResponse<Role[]>> {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select(`
                roles (
                    id,
                    name,
                    description,
                    created_at
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;

        // Garante que cada role tem todos os campos necessários
        const roles = data.map(d => {
            const role = d.roles as any;
            return {
                id: role.id,
                name: role.name,
                description: role.description,
                created_at: role.created_at
            } satisfies Role;
        });

        return { data: roles };
    } catch (error) {
        console.error('Erro ao buscar roles do usuário:', error);
        return { error: 'Erro ao buscar roles do usuário' };
    }
}

export async function checkUserPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
        const { data: roles } = await getUserRoles(userId);
        if (!roles) return false;

        // Buscar permissões de todas as roles do usuário
        const { data, error } = await supabase
            .from('role_permissions')
            .select('permission_id')
            .in('role_id', roles.map(r => r.id));

        if (error) throw error;
        if (!data?.length) return false;

        // Buscar permissões pelos IDs
        const { data: permissions } = await supabase
            .from('permissions')
            .select('name')
            .in('id', data.map(rp => rp.permission_id));

        // Verificar se o usuário tem a permissão específica
        return permissions?.some(p => p.name === permissionName) || false;
    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
    }
}

// Funções para gerenciar roles e permissões
export async function getRoles(): Promise<ApiResponse<Role[]>> {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select(`
                id,
                name,
                description,
                created_at
            `)
            .order('name');

        if (error) throw error;

        // Garante que cada role tem todos os campos necessários
        const roles = data.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            created_at: d.created_at
        })) satisfies Role[];

        return { data: roles };
    } catch (error) {
        console.error('Erro ao buscar roles:', error);
        return { error: 'Erro ao buscar roles' };
    }
}