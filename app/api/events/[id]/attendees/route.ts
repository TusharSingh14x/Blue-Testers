import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const eventId = resolvedParams.id;

    const supabase = await createClient();
    const { data: attendees, error } = await supabase
      .from('event_attendees')
      .select(`
        *,
        user:users(id, full_name, avatar_url, email)
      `)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(attendees);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const eventId = resolvedParams.id;

    console.log('Registering for event:', eventId);

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to register for events.' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventError);
      return NextResponse.json(
        { error: 'Event not found', details: eventError?.message },
        { status: 404 }
      );
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'This event is not currently accepting registrations' },
        { status: 400 }
      );
    }

    // Check if already registered
    const { data: existing, error: existingError } = await supabase
      .from('event_attendees')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing registration:', existingError);
      return NextResponse.json(
        { error: 'Failed to check registration status', details: existingError.message },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({ error: 'You are already registered for this event' }, { status: 400 });
    }

    console.log('Inserting registration...');

    // Register for event
    const { data: attendee, error: insertError } = await supabase
      .from('event_attendees')
      .insert({
        event_id: eventId,
        user_id: user.id,
      })
      .select(`
        *,
        user:users(id, full_name, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting registration:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to register for event',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint || 'Check RLS policies for event_attendees table',
        },
        { status: 500 }
      );
    }

    if (!attendee) {
      return NextResponse.json(
        { error: 'Registration was not created' },
        { status: 500 }
      );
    }

    console.log('Registration successful:', attendee.id);

    // Update attendee count
    const { count, error: countError } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (countError) {
      console.error('Error counting attendees:', countError);
    } else {
      const { error: updateError } = await supabase
        .from('events')
        .update({ attendee_count: count || 0 })
        .eq('id', eventId);

      if (updateError) {
        console.error('Error updating attendee count:', updateError);
      }
    }

    return NextResponse.json(attendee, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/events/[id]/attendees:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to register for event',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const eventId = resolvedParams.id;

    console.log('Unregistering from event:', eventId);

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Unregister from event using Admin Client to bypass RLS issues
    const adminSupabase = await createAdminClient();
    const { error: deleteError } = await adminSupabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting registration:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to unregister from event',
          details: deleteError.message,
          code: deleteError.code,
          hint: deleteError.hint,
        },
        { status: 500 }
      );
    }

    console.log('Unregistration successful');

    // Update attendee count
    const { count, error: countError } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (countError) {
      console.error('Error counting attendees:', countError);
    } else {
      const { error: updateError } = await supabase
        .from('events')
        .update({ attendee_count: count || 0 })
        .eq('id', eventId);

      if (updateError) {
        console.error('Error updating attendee count:', updateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/events/[id]/attendees:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to unregister from event',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

