import { supabaseClient as supabase } from '../../../lib/config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Em produção, você deve adicionar mais segurança aqui
  try {
    // Primeiro verifica se já existe
    const { data: existing } = await supabase
      .from('credenciamento_admin_users')
      .select()
      .eq('username', 'admin')
      .single();

    console.log('Usuário existente:', existing);

    if (existing) {
      return res.status(400).json({ 
        error: 'Usuário admin já existe',
        user: existing 
      });
    }

    // Se não existe, cria
    console.log('Tentando criar usuário admin...');
    
    const { data, error } = await supabase
      .from('credenciamento_admin_users')
      .insert([
        { 
          username: 'admin',
          password: 'admin123'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar admin:', error);
      
      // Verifica permissões do Supabase
      const { data: rls } = await supabaseAdmin
        .from('credenciamento_admin_users')
        .select()
        .limit(1);
      
      console.log('Teste de acesso à tabela:', { rls });
      
      return res.status(500).json({ 
        error: error.message,
        details: error,
        rls
      });
    }

    return res.status(200).json({ 
      message: 'Usuário admin criado com sucesso',
      user: data 
    });
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}