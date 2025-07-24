-- Fix RLS policies for producao_operacoes_audit table
-- Remove all existing policies and create clean, simple ones

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON producao_operacoes_audit;
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON producao_operacoes_audit;
DROP POLICY IF EXISTS "Prevent deletes on audit logs" ON producao_operacoes_audit;
DROP POLICY IF EXISTS "Prevent updates on audit logs" ON producao_operacoes_audit;
DROP POLICY IF EXISTS "allow_all_authenticated_audit" ON producao_operacoes_audit;

-- Create simple, clean policies
CREATE POLICY "audit_insert_policy" ON producao_operacoes_audit
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "audit_select_policy" ON producao_operacoes_audit
FOR SELECT TO authenticated
USING (true);

-- Optional: Prevent updates and deletes (audit logs should be immutable)
CREATE POLICY "audit_no_update_policy" ON producao_operacoes_audit
FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "audit_no_delete_policy" ON producao_operacoes_audit
FOR DELETE TO authenticated
USING (false);

-- Ensure permissions are granted
GRANT INSERT, SELECT ON producao_operacoes_audit TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the new policies
SELECT 
    policyname, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'producao_operacoes_audit'
ORDER BY cmd; 