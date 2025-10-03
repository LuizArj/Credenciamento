-- Script para verificar e corrigir o tipo dos usuários
-- Execute no Supabase SQL Editor para ver o estado atual

-- 1. Verificar estado atual dos usuários
SELECT 
    id,
    username,
    password,
    CASE 
        WHEN password = 'KEYCLOAK_USER' THEN 'keycloak'
        ELSE 'local'
    END as user_type,
    created_at
FROM credenciamento_admin_users
ORDER BY username;

-- 2. Correção: Marcar usuários locais adequadamente
-- (Execute apenas se necessário após verificar o resultado acima)

-- Identificar quais usuários deveriam ser locais
-- Geralmente usuários que não são email @sebrae ou similares
UPDATE credenciamento_admin_users 
SET password = '$2a$12$defaultHashForLocalUsers123456789' 
WHERE username IN ('admin', 'Luiz.araujo', 'cred_eventos', 'credenciamento')
  AND password = 'KEYCLOAK_USER';

-- Comentário: 
-- - Usuários com emails @sebrae.com.br devem permanecer como KEYCLOAK_USER
-- - Usuários com nomes simples (admin, etc.) devem ter hash de senha real para serem locais
-- - O hash acima é apenas um exemplo - em produção, use senhas reais com bcrypt