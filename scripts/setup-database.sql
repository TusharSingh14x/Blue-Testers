-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'user');
CREATE TYPE event_status AS ENUM ('draft', 'active', 'past', 'cancelled');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE resource_type AS ENUM ('room', 'equipment', 'venue', 'transport');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user',
  department TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'user',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  resource_type resource_type NOT NULL,
  location TEXT,
  capacity INT,
  availability_start TIME,
  availability_end TIME,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status booking_status DEFAULT 'pending',
  purpose TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  location TEXT,
  image_url TEXT,
  status event_status DEFAULT 'draft',
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  attendee_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value INT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can read user profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view public communities" ON communities
  FOR SELECT USING (true);

CREATE POLICY "Members can manage community" ON communities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = communities.id 
      AND user_id = auth.uid() 
      AND role = 'organizer'
    )
  );

CREATE POLICY "Members can view community members" ON community_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view approved resources" ON resources
  FOR SELECT USING (status = 'approved' OR auth.uid() = created_by);

CREATE POLICY "Only admins can create resources" ON resources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Resource creators can update their resources" ON resources
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins can approve resources" ON resources
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view bookings" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "Organizers and admins can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('organizer', 'admin')
    )
    AND auth.uid() = user_id
  );

CREATE POLICY "Organizers and admins can update their bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('organizer', 'admin')
    )
  );

CREATE POLICY "Anyone can view published events" ON events
  FOR SELECT USING (status = 'active');

CREATE POLICY "Organizers and admins can create events" ON events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('organizer', 'admin')
    )
  );

CREATE POLICY "Organizers can manage their events" ON events
  FOR UPDATE USING (
    auth.uid() = organizer_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can register for events" ON event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view event attendees" ON event_attendees
  FOR SELECT USING (true);

CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_resource ON bookings(resource_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_community ON events(community_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_approved_by ON resources(approved_by);
CREATE INDEX idx_community_messages_community ON community_messages(community_id);
CREATE INDEX idx_community_messages_user ON community_messages(user_id);
CREATE INDEX idx_community_messages_created_at ON community_messages(created_at);

CREATE POLICY "Community members can view messages" ON community_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_messages.community_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can send messages" ON community_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_messages.community_id
      AND user_id = auth.uid()
    )
    AND auth.uid() = community_messages.user_id
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
  user_full_name TEXT;
BEGIN
  user_role_value := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'user'::user_role
  );
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  
  -- Use INSERT ... ON CONFLICT to handle both new and existing users
  -- This allows updating roles if metadata changes
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role_value
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_general_community()
RETURNS void AS $$
DECLARE
  general_exists BOOLEAN;
  admin_user_id UUID;
BEGIN
  SELECT EXISTS(SELECT 1 FROM communities WHERE name = 'General') INTO general_exists;
  
  IF NOT general_exists THEN
    SELECT id INTO admin_user_id
    FROM users
    WHERE role IN ('admin', 'organizer')
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
      SELECT id INTO admin_user_id
      FROM users
      ORDER BY created_at
      LIMIT 1;
    END IF;
    
    IF admin_user_id IS NOT NULL THEN
      INSERT INTO communities (name, description, created_by, member_count)
      VALUES (
        'General',
        'A general chatroom for all campus members to connect and communicate',
        admin_user_id,
        0
      )
      ON CONFLICT DO NOTHING;
      
      INSERT INTO community_members (community_id, user_id, role)
      SELECT id, admin_user_id, 'organizer'::user_role
      FROM communities
      WHERE name = 'General'
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync a single user's role from auth metadata (for API calls)
CREATE OR REPLACE FUNCTION public.sync_user_role_from_metadata(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Get role from auth metadata
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::user_role,
    'user'::user_role
  ) INTO user_role_value
  FROM auth.users
  WHERE id = user_id;
  
  -- Update the user's role
  UPDATE public.users
  SET role = user_role_value,
      updated_at = NOW()
  WHERE id = user_id;
  
  RETURN user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
