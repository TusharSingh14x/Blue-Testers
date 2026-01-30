-- Create community_messages table if it doesn't exist
-- This table stores messages in community chatrooms

-- Create the table
CREATE TABLE IF NOT EXISTS community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_messages_community ON community_messages(community_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_user ON community_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON community_messages(created_at);

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Community members can view messages" ON community_messages;
DROP POLICY IF EXISTS "Community members can send messages" ON community_messages;

-- Create SELECT policy: members can view messages
CREATE POLICY "Community members can view messages" ON community_messages
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_messages.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- Create INSERT policy: members can send messages
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

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'community_messages'
ORDER BY ordinal_position;

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'community_messages'
ORDER BY policyname;

