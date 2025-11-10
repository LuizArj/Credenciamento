import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { query, withTransaction } from '../../../lib/config/database';

export default async function handler(req, res) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Verificar se o usuário tem permissão de admin para gerenciar usuários
    const userRoles = session.user.roles || [];
    const hasPermission = userRoles.includes('admin');
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Acesso restrito a administradores' });
    }

    switch (req.method) {
      case 'GET':
        return await getUsers(req, res);
      
      case 'POST':
        return await createUser(req, res);
      
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

async function getUsers(req, res) {
  try {
    // Buscar usuários e suas roles
    const sql = `
      SELECT u.id, u.username, u.email, u.keycloak_id, u.created_at,
             COALESCE(json_agg(jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description)) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
      FROM credenciamento_admin_users u
      LEFT JOIN credenciamento_admin_user_roles ur ON ur.user_id = u.id
      LEFT JOIN credenciamento_admin_roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.username
    `;
    const { rows: users } = await query(sql);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email || user.username,
      keycloak_id: user.keycloak_id,
      created_at: user.created_at,
      user_type: user.keycloak_id ? 'keycloak' : 'local',
      roles: user.roles || [],
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
}

async function createUser(req, res) {
  try {
    console.log('=== Iniciando criação de usuário ===');
    console.log('Body recebido:', req.body);
    
    const { username, email, selectedRoles } = req.body;

    if (!username || !username.trim()) {
      console.log('Erro: Username vazio ou inválido');
      return res.status(400).json({ message: 'Nome de usuário é obrigatório' });
    }

    const userEmail = email || username;

    console.log('Username válido:', username.trim());
    console.log('Email:', userEmail);
    console.log('Roles selecionadas:', selectedRoles);

    // Verificar se usuário já existe
    console.log('Verificando se usuário já existe...');
    const { rows: existingUserRows } = await query(
      'SELECT id FROM credenciamento_admin_users WHERE username = $1 OR email = $1 LIMIT 1', 
      [username.trim()]
    );
    const existingUser = existingUserRows[0];
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe no sistema' });
    }

    console.log('Usuário não existe, pode criar');

    // Criar usuário (apenas Keycloak)
    const userData = {
      username: username.trim(),
      email: userEmail.trim(),
    };

    console.log('Dados do usuário a serem inseridos:', userData);

    // Criar usuário e roles em transação
    const newUser = await withTransaction(async (client) => {
      const insertRes = await client.query(
        'INSERT INTO credenciamento_admin_users (username, email, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id',
        [userData.username, userData.email]
      );
      const created = insertRes.rows[0];
      if (!created) throw new Error('Falha ao criar usuário');

      if (selectedRoles && selectedRoles.length > 0) {
        const values = selectedRoles.map((roleId, idx) => `($${idx * 2 + 2}, $${idx * 2 + 3}, NOW())`).join(',');
        const params = [created.id];
        selectedRoles.forEach(roleId => {
          params.push(created.id, roleId);
        });
        await client.query(
          `INSERT INTO credenciamento_admin_user_roles (user_id, role_id, created_at) VALUES ${values} ON CONFLICT DO NOTHING`,
          params
        );
      }

      return created;
    });

    return res.status(201).json({ 
      message: 'Usuário Keycloak criado com sucesso', 
      user: { id: newUser.id, username, email: userEmail } 
    });
  } catch (error) {
    console.error('=== ERRO AO CRIAR USUÁRIO ===');
    console.error('Tipo do erro:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack completo:', error);
    return res.status(500).json({ message: 'Erro ao criar usuário: ' + error.message });
  }
}