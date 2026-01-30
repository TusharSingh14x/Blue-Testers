-- Script to fix existing users' roles from their auth metadata
-- This will update all users' roles to match what they selected during signup

-- Update all users' roles from their auth metadata
UPDATE public.users u
SET 
  role = COALESCE(
    (au.raw_user_meta_data->>'role')::user_role,
    'user'::user_role
  ),
  full_name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    u.full_name
  ),
  updated_at = NOW()
FROM auth.users au
WHERE u.id = au.id
  AND (
    -- Only update if role is different
    u.role != COALESCE((au.raw_user_meta_data->>'role')::user_role, 'user'::user_role)
    OR u.full_name IS DISTINCT FROM au.raw_user_meta_data->>'full_name'
  );

-- Show the results
SELECT 
  u.id,
  u.email,
  u.role as current_role,
  au.raw_user_meta_data->>'role' as metadata_role,
  CASE 
    WHEN u.role = COALESCE((au.raw_user_meta_data->>'role')::user_role, 'user'::user_role) 
    THEN '✓ Match'
    ELSE '✗ Mismatch'
  END as status
FROM public.users u
JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC;

