-- Fix RLS Policy for events table
-- This ensures organizers and admins can create events

-- Drop both possible policy names to be safe
DROP POLICY IF EXISTS "Organizers and admins can create events" ON events;
DROP POLICY IF EXISTS "Only organizers and admins can create events" ON events;

-- Create the INSERT policy for events
CREATE POLICY "Organizers and admins can create events" ON events
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('organizer', 'admin')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'events' AND cmd = 'INSERT';

-- Show all policies for events table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'events'
ORDER BY cmd, policyname;

