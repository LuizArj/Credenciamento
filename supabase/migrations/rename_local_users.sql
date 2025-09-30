-- Rename local_users table to credenciamento_admin_users
ALTER TABLE IF EXISTS local_users RENAME TO credenciamento_admin_users;

-- Update existing references in user_roles table
ALTER TABLE user_roles
DROP CONSTRAINT user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES credenciamento_admin_users(id) 
    ON DELETE CASCADE;

-- Update trigger name
DROP TRIGGER IF EXISTS update_local_users_updated_at ON credenciamento_admin_users;
CREATE TRIGGER update_credenciamento_admin_users_updated_at
    BEFORE UPDATE ON credenciamento_admin_users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Update RLS policies
DROP POLICY IF EXISTS "Local users are viewable by authenticated users" ON credenciamento_admin_users;
DROP POLICY IF EXISTS "Local users are insertable by admins" ON credenciamento_admin_users;
DROP POLICY IF EXISTS "Local users are updatable by admins" ON credenciamento_admin_users;

CREATE POLICY "Admin users are viewable by authenticated users" ON credenciamento_admin_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users are insertable by admins" ON credenciamento_admin_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

CREATE POLICY "Admin users are updatable by admins" ON credenciamento_admin_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );