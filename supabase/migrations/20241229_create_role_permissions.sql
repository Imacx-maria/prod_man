-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  can_access boolean DEFAULT true,
  created_at date DEFAULT CURRENT_DATE,
  updated_at date DEFAULT CURRENT_DATE,
  UNIQUE(role_id, page_path)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_page_path ON public.role_permissions(page_path);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can manage role_permissions" ON public.role_permissions
  FOR ALL USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_DATE;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_role_permissions_updated_at 
  BEFORE UPDATE ON public.role_permissions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default pages (all available pages in the system)
-- These will be the baseline for permission management
INSERT INTO public.role_permissions (role_id, page_path, can_access) 
SELECT r.id, pages.path, 
  CASE 
    -- ALL USERS pages
    WHEN pages.path IN ('/', '/login', '/reset-password', '/update-password', '/dashboard', '/dashboard/profile', '/dashboard/change-password') THEN true
    -- ADMIN can access everything
    WHEN r.name = 'ADMIN' THEN true
    -- PRODUCAO role permissions
    WHEN r.name = 'PRODUCAO' AND pages.path IN (
      '/definicoes/armazens', '/definicoes/clientes', '/definicoes/complexidade', 
      '/definicoes/feriados', '/definicoes/fornecedores', '/definicoes/maquinas', 
      '/definicoes/materiais', '/definicoes/stocks', '/definicoes/transportadoras', 
      '/definicoes/utilizadores', '/producao', '/producao/operacoes', '/designer-flow'
    ) THEN true
    -- ADMINISTRATIVO role permissions  
    WHEN r.name = 'ADMINISTRATIVO' AND pages.path IN (
      '/definicoes/armazens', '/definicoes/clientes', '/definicoes/complexidade',
      '/definicoes/feriados', '/definicoes/fornecedores', '/definicoes/maquinas',
      '/definicoes/materiais', '/definicoes/stocks', '/definicoes/transportadoras',
      '/definicoes/utilizadores', '/producao'
    ) THEN true
    -- OPERADOR role permissions
    WHEN r.name = 'OPERADOR' AND pages.path = '/producao/operacoes' THEN true
    -- DESIGNERS role permissions
    WHEN r.name = 'DESIGNERS' AND pages.path = '/designer-flow' THEN true
    ELSE false
  END
FROM public.roles r
CROSS JOIN (
  VALUES 
    ('/'),
    ('/login'),
    ('/reset-password'), 
    ('/update-password'),
    ('/dashboard'),
    ('/dashboard/profile'),
    ('/dashboard/change-password'),
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
) AS pages(path)
ON CONFLICT (role_id, page_path) DO NOTHING; 