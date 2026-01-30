-- Fix RLS Policies for community_messages table
-- Ensure messages can be sent and viewed correctly

-- Drop existing policies
DROP POLICY IF EXISTS "Community members can view messages" ON community_messages;
DROP POLICY IF EXISTS "Community members can send messages" ON community_messages;

-- Create SELECT policy: members can view messages
-- Use a simple check that doesn't cause recursion
CREATE POLICY "Community members can view messages" ON community_messages
  FOR SELECT 
  USING (
    -- Allow if user is a member (check without recursion)
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_messages.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- Create INSERT policy: members can send messages
-- Make sure user_id matches auth.uid() to prevent spoofing
CREATE POLICY "Community members can send messages" ON community_messages
  FOR INSERT 
  WITH CHECK (
    -- User must be a member of the community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_messages.community_id
      AND cm.user_id = auth.uid()
    )
    -- And user_id must match the authenticated user
    AND auth.uid() = community_messages.user_id
  );

-- Ensure RLS is enabled
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'community_messages'
ORDER BY policyname;

