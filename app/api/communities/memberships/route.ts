import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all communities
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id')
      .order('created_at', { ascending: false });

    if (communitiesError) {
      return NextResponse.json(
        { error: 'Failed to fetch communities', details: communitiesError.message },
        { status: 500 }
      );
    }

    if (!communities || communities.length === 0) {
      return NextResponse.json({ memberships: [] });
    }

    // Get all memberships for this user in one query
    const communityIds = communities.map(c => c.id);
    const { data: memberships, error: membershipsError } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .in('community_id', communityIds);

    if (membershipsError) {
      return NextResponse.json(
        { error: 'Failed to fetch memberships', details: membershipsError.message },
        { status: 500 }
      );
    }

    // Return array of community IDs the user is a member of
    const membershipSet = new Set((memberships || []).map(m => m.community_id));
    
    return NextResponse.json({
      memberships: Array.from(membershipSet),
    });
  } catch (error) {
    console.error('Error fetching memberships:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch memberships' },
      { status: 500 }
    );
  }
}

