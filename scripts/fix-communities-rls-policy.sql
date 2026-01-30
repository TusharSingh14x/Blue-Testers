-- Fix RLS Policies for communities and community_members tables
-- This allows organizers and admins to create communities and add members

-- ============================================
-- 1. Fix communities table INSERT policy
-- ============================================

-- Drop the policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Organizers and admins can create communities" ON communities;

-- Create the INSERT policy for communities
CREATE POLICY "Organizers and admins can create communities" ON communities
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('organizer', 'admin')
    )
  );

-- Also ensure RLS is enabled on the communities table
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Fix community_members table INSERT policy
-- ============================================

-- Drop the policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Users can join communities" ON community_members;

-- Create the INSERT policy for community_members
-- Users can join communities (add themselves as members)
CREATE POLICY "Users can join communities" ON community_members
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Also ensure RLS is enabled on the community_members table
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Verify the policies were created
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename IN ('communities', 'community_members')
ORDER BY tablename, policyname;

