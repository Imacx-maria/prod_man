-- Add foreign key constraint with CASCADE DELETE from auth.users to profiles
-- This ensures that when an authenticated user is deleted, their profile is automatically deleted

-- First, ensure we have the uuid-ossp extension (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add the foreign key constraint with CASCADE DELETE
-- Note: user_id in profiles should reference auth.users(id)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT profiles_user_id_fkey ON public.profiles IS 
'Cascade delete: when auth user is deleted, profile is automatically deleted'; 