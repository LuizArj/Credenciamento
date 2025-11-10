import { query, withTransaction } from '@/lib/config/database';
import bcrypt from 'bcryptjs';
import type {
  LocalUser,
  UserWithRoles,
  CreateUserData,
  ApiResponse,
  AuthResponse,
  Role,
} from '../types/auth';

// ===== AUTENTICAÇÃO =====
export async function authenticateLocalUser(
  username: string,
  password: string
): Promise<AuthResponse> {
  try {
    const uname = (username || '').trim();
    const { rows } = await query('SELECT id, username, password, created_at FROM credenciamento_admin_users WHERE username = $1 LIMIT 1', [uname]);
    const user = rows[0];

    if (!user) {
      return { error: 'Usuário não encontrado' };
    }

    if (user.password === 'KEYCLOAK_USER') {
      return { error: 'Usuário não encontrado' }; // Não é login local
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return { error: 'Senha incorreta' };
    }

    return {
      data: {
        user: {
          ...user,
          roles: [], // mantendo simples; roles podem ser adicionadas depois se necessário
        },
        token: 'local_auth',
      },
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

    const created = await withTransaction(async (client: any) => {
      const insertUser = await client.query(
        'INSERT INTO credenciamento_admin_users (username, password, name, email, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [userData.username, hashedPassword, userData.name, userData.email, new Date().toISOString(), new Date().toISOString()]
      );
      const newUser = insertUser.rows[0];

      if (userData.roles && userData.roles.length > 0) {
        for (const roleId of userData.roles) {
          await client.query('INSERT INTO user_roles (user_id, role_id, created_at) VALUES ($1,$2,$3)', [newUser.id, roleId, new Date().toISOString()]);
        }
      }

      return newUser;
    });

    return { data: created };
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

    const updated = await withTransaction(async (client: any) => {
      // Build set clause dynamically
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const key of Object.keys(updateData)) {
        fields.push(`${key} = $${idx}`);
        values.push((updateData as any)[key]);
        idx++;
      }
      values.push(userId);

      const updateQuery = `UPDATE credenciamento_admin_users SET ${fields.join(', ')}, updated_at = $${idx} WHERE id = $${idx + 1} RETURNING *`;
      // append updated_at and id
      values.splice(values.length - 1, 0, new Date().toISOString());
      values.push(userId);

      // If no fields to update (except updated_at), just update timestamp
      let userRow;
      if (fields.length > 0) {
        const res = await client.query(updateQuery, values);
        userRow = res.rows[0];
      } else {
        const res = await client.query('UPDATE credenciamento_admin_users SET updated_at = $1 WHERE id = $2 RETURNING *', [new Date().toISOString(), userId]);
        userRow = res.rows[0];
      }

      // If roles provided, replace them
      if (updates.roles) {
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        for (const roleId of updates.roles) {
          await client.query('INSERT INTO user_roles (user_id, role_id, created_at) VALUES ($1,$2,$3)', [userId, roleId, new Date().toISOString()]);
        }
      }

      return userRow;
    });

    return { data: updated };
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return { error: 'Erro ao atualizar usuário' };
  }
}

export async function deleteLocalUser(userId: string): Promise<ApiResponse> {
  try {
    await query('DELETE FROM credenciamento_admin_users WHERE id = $1', [userId]);
    return { data: true };
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return { error: 'Erro ao deletar usuário' };
  }
}

export async function getLocalUsers(): Promise<ApiResponse<UserWithRoles[]>> {
  try {
    const res = await query(`
      SELECT u.id, u.username, u.name, u.email, u.created_at, r.id AS role_id, r.name AS role_name, r.description AS role_description
      FROM local_users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      ORDER BY u.username
    `);
    const rows = res.rows || [];

    const map: Record<string, any> = {};
    for (const row of rows) {
      if (!map[row.id]) {
        map[row.id] = { id: row.id, username: row.username, name: row.name, email: row.email, created_at: row.created_at, roles: [] };
      }
      if (row.role_id) {
        map[row.id].roles.push({ id: row.role_id, name: row.role_name, description: row.role_description });
      }
    }

    const usersWithRoles = Object.values(map);
    return { data: usersWithRoles };
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return { error: 'Erro ao buscar usuários' };
  }
}

// Funções para buscar e verificar roles/permissões
export async function getUserRoles(userId: string): Promise<ApiResponse<Role[]>> {
  try {
    const res = await query(`
      SELECT r.id, r.name, r.description, r.created_at
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [userId]);
    const roles = (res.rows || []).map((r) => ({ id: r.id, name: r.name, description: r.description, created_at: r.created_at })) as Role[];
    return { data: roles };
  } catch (error) {
    console.error('Erro ao buscar roles do usuário:', error);
    return { error: 'Erro ao buscar roles do usuário' };
  }
}

export async function checkUserPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  try {
    const { data: roles } = await getUserRoles(userId);
    if (!roles || roles.length === 0) return false;

    const roleIds = roles.map((r) => r.id);
    // Buscar permissões associadas às roles
    const permsRes = await query(`
      SELECT p.name
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ANY($1)
    `, [roleIds]);

    const permissions = permsRes.rows || [];
    return permissions.some((p: any) => p.name === permissionName);
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}

// Funções para gerenciar roles e permissões
export async function getRoles(): Promise<ApiResponse<Role[]>> {
  try {
    const res = await query('SELECT id, name, description, created_at FROM roles ORDER BY name');
    const roles = (res.rows || []).map((d) => ({ id: d.id, name: d.name, description: d.description, created_at: d.created_at })) as Role[];
    return { data: roles };
  } catch (error) {
    console.error('Erro ao buscar roles:', error);
    return { error: 'Erro ao buscar roles' };
  }
}
