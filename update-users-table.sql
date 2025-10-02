-- Script SQL para atualizar a tabela credenciamento_admin_users
-- Execute este script no Supabase SQL Editor

-- Adicionar colunas se não existirem
ALTER TABLE credenciamento_admin_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_local BOOLEAN DEFAULT false;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON credenciamento_admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_local ON credenciamento_admin_users(is_local);

-- Atualizar usuários existentes para serem do tipo Keycloak por padrão
UPDATE credenciamento_admin_users 
SET is_local = false 
WHERE is_local IS NULL;