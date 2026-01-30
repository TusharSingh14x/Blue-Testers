-- Fix RLS Policy for event_attendees table
-- This allows users to delete (unregister from) their own event registrations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can unregister from events" ON event_attendees;

-- Create the DELETE policy for event_attendees
CREATE POLICY "Users can unregister from events" ON event_attendees
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'event_attendees'
ORDER BY cmd, policyname;

