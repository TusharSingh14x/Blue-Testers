-- Script to verify the user creation trigger is set up correctly
-- Run this in Supabase SQL Editor to check if everything is working

-- 1. Check if the trigger function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 3. Check if the sync function exists
SELECT 
  proname as function_name
FROM pg_proc
WHERE proname = 'sync_user_role_from_metadata';

-- 4. Check recent users and their roles
SELECT 
  u.id,
  u.email,
  u.role as db_role,
  au.raw_user_meta_data->>'role' as metadata_role,
  au.raw_user_meta_data->>'full_name' as metadata_full_name,
  u.full_name as db_full_name,
  u.created_at
FROM public.users u
JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. If trigger is missing, create it
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger does not exist. Creating it...';
    
    -- Create the function if it doesn't exist
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    DECLARE
      user_role_value user_role;
      user_full_name TEXT;
    BEGIN
      user_role_value := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'user'::user_role
      );
      user_full_name := NEW.raw_user_meta_data->>'full_name';
      
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_role_value
      )
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        email = EXCLUDED.email,
        updated_at = NOW();
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Create the trigger
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE 'Trigger created successfully!';
  ELSE
    RAISE NOTICE 'Trigger already exists.';
  END IF;
END $$;

