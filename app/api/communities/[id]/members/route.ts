import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityId = resolvedParams.id;

    const supabase = await createClient();
    const { data: members, error } = await supabase
      .from('community_members')
      .select(`
        *,
        user:users(id, full_name, avatar_url)
      `)
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

