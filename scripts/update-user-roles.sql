-- Script to update existing users' roles from their auth metadata
-- This is useful if users were created before the trigger was set up properly

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

-- Function to sync all user roles from auth metadata (for manual runs)
CREATE OR REPLACE FUNCTION public.sync_user_roles_from_metadata()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  user_role_value user_role;
BEGIN
  -- Loop through all users and update their roles from auth metadata
  FOR user_record IN 
    SELECT u.id, u.email, au.raw_user_meta_data
    FROM public.users u
    JOIN auth.users au ON u.id = au.id
  LOOP
    -- Extract role from metadata
    user_role_value := COALESCE(
      (user_record.raw_user_meta_data->>'role')::user_role,
      'user'::user_role
    );
    
    -- Update the user's role if it's different
    UPDATE public.users
    SET role = user_role_value,
        updated_at = NOW()
    WHERE id = user_record.id
      AND role != user_role_value;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function for all users (optional - uncomment to run)
-- SELECT public.sync_user_roles_from_metadata();

-- Also update the trigger to handle updates (optional - for future signups)
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

