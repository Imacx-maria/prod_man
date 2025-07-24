-- RLS Policies for producao_operacoes_audit table
-- This allows authenticated users to insert and read audit logs

-- First, enable RLS on the table (if not already enabled)
ALTER TABLE producao_operacoes_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "allow_authenticated_insert_audit" ON producao_operacoes_audit;
DROP POLICY IF EXISTS "allow_authenticated_read_audit" ON producao_operacoes_audit;
DROP POLICY IF EXISTS "allow_all_authenticated_audit" ON producao_operacoes_audit;

-- Create a comprehensive policy that allows authenticated users to insert and read audit logs
CREATE POLICY "allow_all_authenticated_audit" ON producao_operacoes_audit
FOR ALL USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Alternative: More specific policies (use these instead if you prefer granular control)
-- CREATE POLICY "allow_authenticated_insert_audit" ON producao_operacoes_audit
-- FOR INSERT TO authenticated
-- WITH CHECK (true);

-- CREATE POLICY "allow_authenticated_read_audit" ON producao_operacoes_audit
-- FOR SELECT TO authenticated
-- USING (true);

-- Ensure the table has proper structure and constraints
-- (Run this only if the table doesn't exist or needs to be recreated)

-- CREATE TABLE IF NOT EXISTS producao_operacoes_audit (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   operacao_id UUID REFERENCES producao_operacoes(id) ON DELETE CASCADE,
--   field_name TEXT NOT NULL,
--   old_value TEXT,
--   new_value TEXT,
--   changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
--   changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Grant necessary permissions
GRANT ALL ON producao_operacoes_audit TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'producao_operacoes_audit'; 