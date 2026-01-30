-- Safely fix RLS Policy for resources table
-- This drops both old and new policy names, then creates the correct one

-- Drop both possible policy names
DROP POLICY IF EXISTS "Only admins can create resources" ON resources;
DROP POLICY IF EXISTS "Organizers and admins can create resources" ON resources;

-- Create the correct policy: organizers and admins can create resources
CREATE POLICY "Organizers and admins can create resources" ON resources
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('organizer', 'admin')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Verify the policy was created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'resources' AND cmd = 'INSERT';

-- Also show all policies for resources table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'resources'
ORDER BY cmd, policyname;

