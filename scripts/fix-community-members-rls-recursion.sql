-- Fix infinite recursion in community_members RLS policies
-- The issue is that the SELECT policy checks community_members, which causes recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view community members" ON community_members;

-- Create a simpler SELECT policy that doesn't cause recursion
-- Allow users to see members of communities they're part of, but check differently
CREATE POLICY "Users can view community members" ON community_members
  FOR SELECT 
  USING (
    -- Allow if user is viewing their own membership
    auth.uid() = user_id
    OR
    -- Allow if user is a member (but check without recursion)
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      -- Use a different approach to avoid recursion: check the community directly
      AND EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = cm.community_id
      )
    )
  );

-- Actually, let's make it even simpler - just allow viewing members of public communities
-- Or better yet, allow anyone to view members (since communities are public)
DROP POLICY IF EXISTS "Users can view community members" ON community_members;

-- Simple policy: anyone can view community members (communities are public)
CREATE POLICY "Anyone can view community members" ON community_members
  FOR SELECT 
  USING (true);

-- Make sure INSERT policy exists and is correct
DROP POLICY IF EXISTS "Users can join communities" ON community_members;

CREATE POLICY "Users can join communities" ON community_members
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'community_members'
ORDER BY policyname;

