-- Fix RLS Policy for resources table
-- Allow organizers and admins to create resources (not just admins)

-- Drop the existing policy
DROP POLICY IF EXISTS "Only admins can create resources" ON resources;

-- Create new policy: organizers and admins can create resources
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

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'resources' AND cmd = 'INSERT';

