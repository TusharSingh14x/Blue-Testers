-- Fix RLS Policy for users table
-- This ensures users can insert their own profile

-- First, check if the policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users' AND policyname = 'Users can insert their own profile';

-- Drop the policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create the INSERT policy
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- Also ensure RLS is enabled on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

