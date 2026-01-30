import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const eventId = resolvedParams.id;

    console.log('Fetching event:', eventId);

    const supabase = await createClient();
    
    // First, get the basic event data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw eventError;
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get organizer info
    let organizer = null;
    if (event.organizer_id) {
      const { data: organizerData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', event.organizer_id)
        .single();
      organizer = organizerData;
    }

    // Get attendee count
    const { count: attendeeCount } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    console.log('Event fetched successfully:', event.id);

    return NextResponse.json({
      ...event,
      organizer,
      attendee_count: attendeeCount || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/events/[id]:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch event',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

