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
    const { data: community, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single();

    if (error) throw error;

    return NextResponse.json(community);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch community' },
      { status: 500 }
    );
  }
}

