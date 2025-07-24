-- Verification queries for producao_operacoes_audit table (Supabase compatible)

-- 1. Check if the table exists and has the right structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'producao_operacoes_audit' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check current RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'producao_operacoes_audit';

-- 3. Check table constraints and foreign keys
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'producao_operacoes_audit';

-- 4. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'producao_operacoes_audit';

-- 5. Test current user permissions (this will show if you can access the table)
SELECT COUNT(*) as audit_entries_count 
FROM producao_operacoes_audit; 