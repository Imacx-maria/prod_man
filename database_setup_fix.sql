-- Manual setup for role-based permissions system
-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. First, let's check what roles exist
SELECT * FROM roles ORDER BY name;

-- 2. Check what your current user profile looks like
SELECT p.*, r.name as role_name 
FROM profiles p 
LEFT JOIN roles r ON p.role_id = r.id 
WHERE p.user_id = auth.uid();

-- 3. If you don't have the required roles, create them:
-- (Only run the INSERT statements for roles that don't exist)
INSERT INTO public.roles (id, name, description, created_at) 
SELECT 
  gen_random_uuid(), 
  role_name, 
  role_desc, 
  NOW()
FROM (VALUES 
  ('ADMIN', 'Administrator with full access'),
  ('PRODUCAO', 'Production manager'),
  ('ADMINISTRATIVO', 'Administrative staff'),
  ('OPERADOR', 'Production operator'),
  ('DESIGNERS', 'Design team')
) AS new_roles(role_name, role_desc)
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE name = new_roles.role_name
);

-- 4. Update your current user profile to have ADMIN role
UPDATE public.profiles 
SET role_id = (SELECT id FROM public.roles WHERE name = 'ADMIN' LIMIT 1)
WHERE user_id = auth.uid();

-- 5. Verify your profile was updated correctly
SELECT p.*, r.name as role_name 
FROM profiles p 
LEFT JOIN roles r ON p.role_id = r.id 
WHERE p.user_id = auth.uid();

-- 6. Check if role_permissions table exists and has data
SELECT COUNT(*) as permission_count FROM role_permissions;

-- 7. If the count is 0, populate with default permissions
-- This avoids the ON CONFLICT error by using NOT EXISTS
WITH role_pages AS (
  SELECT r.id as role_id, r.name as role_name,
         page_path
  FROM public.roles r
  CROSS JOIN (VALUES 
    ('/'),
    ('/dashboard'),
    ('/dashboard/profile'),
    ('/dashboard/change-password'),
    ('/login'),
    ('/reset-password'),
    ('/update-password'),
    ('/definicoes/armazens'),
    ('/definicoes/clientes'),
    ('/definicoes/complexidade'),
    ('/definicoes/feriados'),
    ('/definicoes/fornecedores'),
    ('/definicoes/maquinas'),
    ('/definicoes/materiais'),
    ('/definicoes/stocks'),
    ('/definicoes/transportadoras'),
    ('/definicoes/utilizadores'),
    ('/producao'),
    ('/producao/operacoes'),
    ('/designer-flow'),
    ('/components'),
    ('/payments'),
    ('/test-examples')
  ) AS pages(page_path)
)
INSERT INTO public.role_permissions (role_id, page_path, can_access)
SELECT 
  rp.role_id,
  rp.page_path,
  CASE 
    -- Admin has access to everything
    WHEN rp.role_name = 'ADMIN' THEN true  
    
    -- Production manager has access to all definitions + production + design
    WHEN rp.role_name = 'PRODUCAO' AND (
      rp.page_path IN ('/', '/dashboard', '/dashboard/profile', '/dashboard/change-password', '/designer-flow', '/producao', '/producao/operacoes') OR
      rp.page_path LIKE '/definicoes/%'
    ) THEN true
    
    -- Administrative staff has access to all definitions + main production page
    WHEN rp.role_name = 'ADMINISTRATIVO' AND (
      rp.page_path IN ('/', '/dashboard', '/dashboard/profile', '/dashboard/change-password', '/producao') OR
      rp.page_path LIKE '/definicoes/%'
    ) THEN true
    
    -- Operators have basic access + production operations
    WHEN rp.role_name = 'OPERADOR' AND rp.page_path IN (
      '/', '/dashboard', '/dashboard/profile', '/dashboard/change-password', '/producao/operacoes'
    ) THEN true
    
    -- Designers have basic access + design flow
    WHEN rp.role_name = 'DESIGNERS' AND rp.page_path IN (
      '/', '/dashboard', '/dashboard/profile', '/dashboard/change-password', '/designer-flow'
    ) THEN true
    
    ELSE false
  END
FROM role_pages rp
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions 
  WHERE role_id = rp.role_id AND page_path = rp.page_path
);

-- 8. Verify the setup worked
SELECT 
  r.name as role_name,
  COUNT(*) as total_permissions,
  COUNT(CASE WHEN rp.can_access THEN 1 END) as granted_permissions
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY r.name;

-- 9. Check your specific permissions as the current user
SELECT 
  r.name as your_role,
  COUNT(CASE WHEN rp.can_access THEN 1 END) as pages_you_can_access,
  COUNT(*) as total_pages
FROM public.profiles p
JOIN public.roles r ON p.role_id = r.id
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
WHERE p.user_id = auth.uid()
GROUP BY r.id, r.name;

-- 10. List all pages you have access to
SELECT rp.page_path, rp.can_access
FROM public.profiles p
JOIN public.roles r ON p.role_id = r.id
JOIN public.role_permissions rp ON r.id = rp.role_id
WHERE p.user_id = auth.uid() AND rp.can_access = true
ORDER BY rp.page_path; 