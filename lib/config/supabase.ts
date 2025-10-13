/**
 * Cliente Supabase centralizado e tipado
 * 
 * @module lib/config/supabase
 * @description Exporta instâncias configuradas do Supabase para uso em diferentes contextos
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './env';
import type { Database } from '@/types/database.types';

/**
 * Cliente Supabase para uso no lado do cliente (browser)
 * Usa a chave anônima (anon key) que é segura para exposição pública
 */
export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Cliente Supabase para uso no servidor com privilégios elevados
 * Usa a service role key que tem acesso total ao banco
 * ⚠️ NUNCA exponha este cliente no lado do cliente
 */
let supabaseAdminInstance: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!supabaseConfig.serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não está configurada. ' +
        'Esta chave é necessária para operações administrativas.'
    );
  }

  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return supabaseAdminInstance;
}

/**
 * Cliente Supabase para uso em API routes do Next.js
 * Similar ao cliente do browser mas sem persistência de sessão
 */
export const supabaseApi: SupabaseClient<Database> = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Helper para verificar se o cliente está configurado corretamente
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

/**
 * Helper para verificar se o admin está configurado
 */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.serviceRoleKey);
}

// Exportar configuração para uso direto quando necessário
export { supabaseConfig };

// Alias para compatibilidade com código legado (deprecar gradualmente)
/**
 * @deprecated Use `supabaseClient` ao invés de `supabase`
 */
export const supabase = supabaseClient;
