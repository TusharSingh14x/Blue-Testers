-- Fix RLS Policy for events table
-- Ensure organizers and admins can create events

-- Drop existing policies
DROP POLICY IF EXISTS "Organizers and admins can create events" ON events;
DROP POLICY IF EXISTS "Only organizers and admins can create events" ON events;

-- Create INSERT policy: organizers and admins can create events
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

