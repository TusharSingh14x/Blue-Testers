import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Initialize default General community
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if General community already exists
    const { data: existing } = await supabase
      .from('communities')
      .select('*')
      .eq('name', 'General')
      .single();

    if (existing) {
      return NextResponse.json({ 
        message: 'General community already exists',
        community: existing 
      });
    }

    // Only organizers and admins can create the General community
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['organizer', 'admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only organizers and admins can create the General community' },
        { status: 403 }
      );
    }

    // Use current user as creator (they're an organizer/admin)
    const creatorId = user.id;

    // Create General community
    const { data: community, error } = await supabase
      .from('communities')
      .insert([
        {
          name: 'General',
          description: 'A general chatroom for all campus members to connect and communicate',
          created_by: creatorId,
          member_count: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Add creator as organizer member (if they exist)
    if (creatorId) {
      await supabase.from('community_members').insert({
        community_id: community.id,
        user_id: creatorId,
        role: 'organizer',
      }).catch(() => {
        // Ignore if already exists or user doesn't exist
      });
    }

    return NextResponse.json(community, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create General community' },
      { status: 500 }
    );
  }
}

