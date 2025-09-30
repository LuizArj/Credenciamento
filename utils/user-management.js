import { createClient } from '@supabase/supabase-js';

// Cliente Supabase com chave de serviço para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cliente Supabase com chave anônima para operações públicas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function authenticateLocalUser(username, password) {
  try {
    console.log('Tentando autenticar usuário:', username);
    
    // Busca o usuário e suas roles na tabela de admins
    const { data: userData, error: userError } = await supabaseAdmin
      .from('credenciamento_admin_users')
      .select(`
        *,
        roles:credenciamento_admin_user_roles(
          role:credenciamento_admin_roles(
            name
          )
        )
      `)
      .eq('username', username)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return { error: { message: 'Usuário não encontrado' }, data: null };
    }

    if (!userData) {
      console.error('Usuário não encontrado na tabela de admins');
      return { error: { message: 'Usuário não encontrado' }, data: null };
    }

    // Verifica se a senha está correta
    if (userData.password !== password) {
      console.error('Senha incorreta');
      return { error: { message: 'Credenciais inválidas' }, data: null };
    }

    // Extraindo as roles do usuário
    console.log('Dados completos do usuário do banco:', JSON.stringify(userData, null, 2));
    console.log('Roles brutos do banco:', userData.roles);

    const roles = userData.roles?.map(r => {
      console.log('Processando role:', r);
      console.log('Role.role:', r.role);
      return r.role.name;
    }) || [];
    
    console.log('Roles extraídas após processamento:', roles);
    
    const user = {
      id: String(userData.id),
      name: userData.username,
      email: userData.username,
      roles: roles,
      isLocalUser: true
    };
    
    console.log('Objeto de usuário construído:', user);

    return { 
      error: null, 
      data: { user }
    };
  } catch (error) {
    console.error('Erro inesperado:', error);
    return { error: { message: 'Erro interno do servidor' }, data: null };
  }
}