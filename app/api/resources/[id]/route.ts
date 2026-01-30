import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const resourceId = resolvedParams.id;

    const supabase = await createClient();
    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single();

    if (error) throw error;

    return NextResponse.json(resource);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

