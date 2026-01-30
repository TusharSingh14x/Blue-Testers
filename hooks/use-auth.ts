'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            // If profile doesn't exist, try to create it from auth metadata
            if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
              // This is expected - profile doesn't exist yet, we'll create it
              console.log('Profile not found, creating from auth metadata...');
              
              const userMetadata = session.user.user_metadata || {};
              const roleFromMetadata = userMetadata.role || 'user';
              const fullNameFromMetadata = userMetadata.full_name || session.user.email?.split('@')[0] || '';
              
              const { data: newProfile, error: createError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name: fullNameFromMetadata,
                  role: roleFromMetadata as 'user' | 'organizer' | 'admin',
                })
                .select()
                .single();
              
              if (createError) {
                // Only log if it's not a duplicate key error (profile might have been created by trigger)
                if (createError.code !== '23505' && !createError.message?.includes('duplicate')) {
                  console.warn('Could not create profile (may have been created by trigger):', createError.message);
                }
                // Set a minimal profile so the app doesn't crash
                setProfile({
                  id: session.user.id,
                  email: session.user.email || '',
                  role: roleFromMetadata,
                  full_name: fullNameFromMetadata,
                });
              } else {
                console.log('✓ Profile created successfully:', { id: newProfile?.id, role: newProfile?.role });
                setProfile(newProfile);
              }
            } else {
              // For other errors (permissions, network, etc.), log and set minimal profile
              console.error('Error fetching profile:', {
                code: profileError.code,
                message: profileError.message,
                details: profileError.details
              });
              // Set a minimal profile so the app doesn't crash
              setProfile({
                id: session.user.id,
                email: session.user.email || '',
                role: session.user.user_metadata?.role || 'user',
                full_name: session.user.user_metadata?.full_name || '',
              });
            }
          } else {
            console.log('Profile fetched:', { id: profileData?.id, role: profileData?.role, email: profileData?.email });
          setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            // If profile doesn't exist, try to create it from auth metadata
            if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
              // This is expected - profile doesn't exist yet, we'll create it
              console.log('Profile not found on auth change, creating from auth metadata...');
              
              try {
                const userMetadata = session.user.user_metadata || {};
                const roleFromMetadata = userMetadata.role || 'user';
                const fullNameFromMetadata = userMetadata.full_name || session.user.email?.split('@')[0] || '';
                
                const { data: newProfile, error: createError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: session.user.email || '',
                    full_name: fullNameFromMetadata,
                    role: roleFromMetadata as 'user' | 'organizer' | 'admin',
                  })
                  .select()
                  .single();
                
                if (createError) {
                  // Handle different error types
                  if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
                    // Profile already exists (probably created by trigger) - try to fetch it
                    console.log('Profile already exists, fetching it...');
                    const { data: existingProfile } = await supabase
                      .from('users')
                      .select('*')
                      .eq('id', session.user.id)
                      .single();
                    
                    if (existingProfile) {
                      console.log('✓ Profile fetched:', { id: existingProfile.id, role: existingProfile.role });
                      setProfile(existingProfile);
                    } else {
                      // Fallback to metadata-based profile
                      setProfile({
                        id: session.user.id,
                        email: session.user.email || '',
                        role: roleFromMetadata,
                        full_name: fullNameFromMetadata,
                      });
                    }
                  } else if (createError.code === '42501' || createError.message?.includes('permission denied') || createError.message?.includes('RLS')) {
                    // RLS permission error
                    console.error('❌ Permission denied when creating profile. Check RLS policies:', {
                      code: createError.code,
                      message: createError.message,
                      hint: 'Make sure you have an INSERT policy on the users table: CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);'
                    });
                    // Set a minimal profile so the app doesn't crash
                    setProfile({
                      id: session.user.id,
                      email: session.user.email || '',
                      role: roleFromMetadata,
                      full_name: fullNameFromMetadata,
                    });
                  } else {
                    // Other errors
                    console.error('❌ Error creating profile:', {
                      code: createError.code,
                      message: createError.message,
                      details: createError.details,
                      hint: createError.hint
                    });
                    // Set a minimal profile so the app doesn't crash
                    setProfile({
                      id: session.user.id,
                      email: session.user.email || '',
                      role: roleFromMetadata,
                      full_name: fullNameFromMetadata,
                    });
                  }
                } else if (newProfile) {
                  console.log('✓ Profile created on auth change:', { id: newProfile.id, role: newProfile.role });
                  setProfile(newProfile);
                }
              } catch (err) {
                console.error('❌ Unexpected error creating profile:', err);
                // Set a minimal profile so the app doesn't crash
                const userMetadata = session.user.user_metadata || {};
                setProfile({
                  id: session.user.id,
                  email: session.user.email || '',
                  role: userMetadata.role || 'user',
                  full_name: userMetadata.full_name || '',
                });
              }
            } else {
              // For other errors (permissions, network, etc.), log and set minimal profile
              console.error('Error fetching profile on auth change:', {
                code: profileError.code,
                message: profileError.message,
                details: profileError.details
              });
              // Set a minimal profile so the app doesn't crash
              setProfile({
                id: session.user.id,
                email: session.user.email || '',
                role: session.user.user_metadata?.role || 'user',
                full_name: session.user.user_metadata?.full_name || '',
              });
            }
          } else {
            console.log('Profile updated on auth change:', { id: profileData?.id, role: profileData?.role, email: profileData?.email });
          setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/auth/login');
  };

  return { user, profile, loading, logout };
}
