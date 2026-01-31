import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Don't auto-create General community here - only organizers/admins can create it
    // The RPC function or init endpoint should be called explicitly by organizers/admins

    const { data: communities, error } = await supabase
      .from('communities')
      .select('*, community_members(count)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to map the count to member_count property
    const formattedCommunities = communities.map((community: any) => ({
      ...community,
      member_count: community.community_members?.[0]?.count || 0
    }));

    return NextResponse.json(formattedCommunities);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch communities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json({ error: 'Authentication error', details: userError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Creating community for user:', user.id);

    // Check if user is organizer or admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile setup.' },
        { status: 404 }
      );
    }

    console.log('User role:', userProfile.role);

    if (!['organizer', 'admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only organizers and admins can create communities', currentRole: userProfile.role },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    console.log('Inserting community:', { name: body.name, created_by: user.id });

    const { data: community, error: insertError } = await supabase
      .from('communities')
      .insert([
        {
          name: body.name,
          description: body.description,
          created_by: user.id,
          member_count: 0,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting community:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to create community',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        },
        { status: 500 }
      );
    }

    if (!community) {
      return NextResponse.json(
        { error: 'Community was not created' },
        { status: 500 }
      );
    }

    console.log('Community created:', community.id);

    // Add creator as organizer member
    const { error: memberError } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'organizer',
    });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Don't fail the request, but log it
      // The community was created successfully
    }

    return NextResponse.json(community, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating community:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create community',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

