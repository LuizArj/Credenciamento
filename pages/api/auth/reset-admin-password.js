import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Criar um cliente Supabase com service_role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.EJ5oiKtCGRMa8HVXO0ZEccUrDzV5lhz0kklx9cr7SKE'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Gera o hash da nova senha
    const salt = await bcrypt.genSalt(6);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    console.log('Atualizando senha do admin...');

    // Atualiza a senha do usuário admin
    const { data, error } = await supabaseAdmin
      .from('credenciamento_admin_users')
      .update({ password: hashedPassword })
      .eq('username', 'admin')
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar senha:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Senha atualizada com sucesso:', { 
      id: data.id,
      username: data.username,
      newPassword: 'admin123' // só mostra em desenvolvimento
    });

    return res.status(200).json({ 
      message: 'Senha atualizada com sucesso',
      user: {
        id: data.id,
        username: data.username
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}