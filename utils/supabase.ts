import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import type { 
    LocalUser, 
    UserWithRoles, 
    CreateUserData, 
    ApiResponse,
    AuthResponse 
} from '../types/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltando configurações do Supabase. Verifique as variáveis de ambiente.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ===== AUTENTICAÇÃO =====
export async function authenticateLocalUser(username: string, password: string): Promise<AuthResponse> {
    try {
        const { data: user, error } = await supabase
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
            .eq('username', username)
            .single()

        if (error || !user) {
            return { error: 'Usuário não encontrado' }
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return { error: 'Senha incorreta' }
        }

        // Remove a senha do objeto de usuário
        const { password: _, ...userWithoutPassword } = user
        
        // Estrutura as roles do usuário
        const roles = user.user_roles.map(ur => ur.roles)

        return {
            data: {
                user: {
                    ...userWithoutPassword,
                    roles
                },
                token: 'local_auth' // Token local para diferenciar de auth do Keycloak
            }
        }
    } catch (error) {
        console.error('Erro na autenticação:', error)
        return { error: 'Erro ao autenticar usuário' }
    }
}

// ===== GERENCIAMENTO DE USUÁRIOS =====
export async function createLocalUser(userData: CreateUserData): Promise<ApiResponse<LocalUser>> {
    try {
        // Hash da senha
        const hashedPassword = await bcrypt.hash(userData.password, 10)

        // Criar usuário
        const { data: user, error: userError } = await supabase
            .from('local_users')
            .insert({
                username: userData.username,
                password: hashedPassword,
                name: userData.name,
                email: userData.email
            })
            .select()
            .single()

        if (userError) throw userError

        // Associar roles
        if (userData.roles.length > 0) {
            const { error: rolesError } = await supabase
                .from('user_roles')
                .insert(
                    userData.roles.map(roleId => ({
                        user_id: user.id,
                        role_id: roleId
                    }))
                )

            if (rolesError) throw rolesError
        }

        return { data: user }
    } catch (error) {
        console.error('Erro ao criar usuário:', error)
        return { error: 'Erro ao criar usuário' }
    }
}

export async function updateLocalUser(
    userId: string, 
    updates: Partial<CreateUserData>
): Promise<ApiResponse<LocalUser>> {
    try {
        const updateData: any = { ...updates }
        
        // Se tiver senha nova, fazer hash
        if (updates.password) {
            updateData.password = await bcrypt.hash(updates.password, 10)
        }

        // Atualizar usuário
        const { data: user, error: userError } = await supabase
            .from('local_users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single()

        if (userError) throw userError

        // Se tiver roles novas, atualizar
        if (updates.roles) {
            // Remover roles antigas
            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId)

            // Adicionar roles novas
            const { error: rolesError } = await supabase
                .from('user_roles')
                .insert(
                    updates.roles.map(roleId => ({
                        user_id: userId,
                        role_id: roleId
                    }))
                )

            if (rolesError) throw rolesError
        }

        return { data: user }
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error)
        return { error: 'Erro ao atualizar usuário' }
    }
}

export async function deleteLocalUser(userId: string): Promise<ApiResponse> {
    try {
        const { error } = await supabase
            .from('local_users')
            .delete()
            .eq('id', userId)

        if (error) throw error

        return { data: true }
    } catch (error) {
        console.error('Erro ao deletar usuário:', error)
        return { error: 'Erro ao deletar usuário' }
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
            .order('username')

        if (error) throw error

        // Remove senhas e estrutura roles
        const usersWithRoles = users.map(user => {
            const { password: _, ...userWithoutPassword } = user
            return {
                ...userWithoutPassword,
                roles: user.user_roles.map(ur => ur.roles)
            }
        })

        return { data: usersWithRoles }
    } catch (error) {
        console.error('Erro ao buscar usuários:', error)
        return { error: 'Erro ao buscar usuários' }
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
                    description
                )
            `)
            .eq('user_id', userId)

        if (error) throw error

        return { data: data.map(d => d.roles) }
    } catch (error) {
        console.error('Erro ao buscar roles do usuário:', error)
        return { error: 'Erro ao buscar roles do usuário' }
    }
}

export async function checkUserPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
        const { data: roles } = await getUserRoles(userId)
        if (!roles) return false

        // Buscar permissões de todas as roles do usuário
        const { data: permissions, error } = await supabase
            .from('role_permissions')
            .select(`
                permissions (
                    name
                )
            `)
            .in('role_id', roles.map(r => r.id))

        if (error) throw error

        // Verificar se o usuário tem a permissão específica
        return permissions.some(p => p.permissions.name === permissionName)
    } catch (error) {
        console.error('Erro ao verificar permissão:', error)
        return false
    }
}

// Função para buscar eventos
export async function getEvents(type = null) {
  let query = supabase
    .from('credenciamento_events')
    .select('*')
    .order('date', { ascending: true })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  return { data, error }
}

// Função para registrar check-in de participante
export async function checkInParticipant(participantId, eventId, attendantName) {
  const { data: participant, error: participantError } = await supabase
    .from('credenciamento_participants')
    .update({ 
      checked_in_at: new Date().toISOString(),
      checked_in_by: attendantName
    })
    .eq('id', participantId)
    .single()

  if (participantError) return { error: participantError }

  // Registrar log
  const { error: logError } = await supabase
    .from('credenciamento_logs')
    .insert([{
      participant_id: participantId,
      event_id: eventId,
      action: 'check_in',
      attendant_name: attendantName
    }])

  return { data: participant, error: logError }
}