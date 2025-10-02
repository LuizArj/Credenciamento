import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Verificar se o usuário tem permissão de gerenciar usuários
    const userRoles = session.user.roles || [];
    const hasPermission = userRoles.includes('admin') || userRoles.includes('manager');
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Sem permissão para listar usuários' });
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
    const { data: users, error } = await supabaseAdmin
      .from('credenciamento_admin_users')
      .select(`
        id,
        username,
        created_at,
        roles:credenciamento_admin_user_roles(
          role:credenciamento_admin_roles(
            id,
            name,
            description
          )
        )
      `)
      .order('username');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }

    // Formatar dados para o frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.username, // Assumindo que o username é o email
      created_at: user.created_at,
      roles: user.roles.map(r => r.role)
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
    
    const { username, password, userType, selectedRoles } = req.body;

    if (!username || !username.trim()) {
      console.log('Erro: Username vazio ou inválido');
      return res.status(400).json({ message: 'Nome de usuário é obrigatório' });
    }

    // Validação específica por tipo de usuário
    if (userType === 'local') {
      if (!password || password.length < 6) {
        console.log('Erro: Senha inválida para usuário local');
        return res.status(400).json({ message: 'Senha é obrigatória e deve ter pelo menos 6 caracteres para usuários locais' });
      }
    }

    console.log('Username válido:', username.trim());
    console.log('Tipo de usuário:', userType);
    console.log('Roles selecionadas:', selectedRoles);

    // Verificar se usuário já existe
    console.log('Verificando se usuário já existe...');
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('credenciamento_admin_users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar usuário existente:', checkError);
      throw checkError;
    }

    if (existingUser) {
      console.log('Usuário já existe:', existingUser);
      return res.status(400).json({ message: 'Usuário já existe no sistema' });
    }

    console.log('Usuário não existe, pode criar');

    // Preparar dados do usuário baseado no tipo
    let userData;
    
    if (userType === 'local') {
      // Para usuários locais, fazer hash da senha
      console.log('Criando hash da senha para usuário local...');
      const hashedPassword = await bcrypt.hash(password, 12);
      
      userData = {
        username: username.trim(),
        password: hashedPassword
      };
    } else {
      // Para usuários Keycloak, usar senha padrão
      userData = {
        username: username.trim(),
        password: 'KEYCLOAK_USER' // Valor padrão para usuários Keycloak
      };
    }

    console.log('Dados do usuário a serem inseridos:', { ...userData, password: '[HIDDEN]' });

    // Criar usuário
    console.log('Criando usuário no banco...');
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('credenciamento_admin_users')
      .insert(userData)
      .select('id')
      .single();

    if (userError) {
      console.error('Erro ao criar usuário no banco:', userError);
      throw userError;
    }

    console.log('Usuário criado com sucesso:', newUser);

    // Adicionar roles se selecionadas
    if (selectedRoles && selectedRoles.length > 0) {
      console.log('Atribuindo roles ao usuário...');
      const roleAssignments = selectedRoles.map(roleId => ({
        user_id: newUser.id,
        role_id: roleId
      }));

      console.log('Dados de roles a serem inseridos:', roleAssignments);

      const { error: rolesError } = await supabaseAdmin
        .from('credenciamento_admin_user_roles')
        .insert(roleAssignments);

      if (rolesError) {
        console.error('Erro ao atribuir roles:', rolesError);
        // Se falhar ao atribuir roles, remover o usuário criado
        console.log('Removendo usuário criado devido ao erro nos roles...');
        await supabaseAdmin
          .from('credenciamento_admin_users')
          .delete()
          .eq('id', newUser.id);
        
        throw rolesError;
      }

      console.log('Roles atribuídas com sucesso');
    }

    console.log(`=== Usuário ${userType} criado com sucesso: ${username} ===`);
    
    return res.status(201).json({ 
      message: `Usuário ${userType === 'local' ? 'local' : 'Keycloak'} criado com sucesso`,
      user: { 
        id: newUser.id, 
        username,
        userType
      }
    });
  } catch (error) {
    console.error('=== ERRO AO CRIAR USUÁRIO ===');
    console.error('Tipo do erro:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack completo:', error);
    return res.status(500).json({ message: 'Erro ao criar usuário: ' + error.message });
  }
}