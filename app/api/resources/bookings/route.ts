import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Get all bookings for resources (to show availability)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');

    let query = supabase
      .from('bookings')
      .select(`
        *,
        resource:resources(id, name),
        user:users(id, full_name)
      `)
      .order('start_time', { ascending: true });

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

