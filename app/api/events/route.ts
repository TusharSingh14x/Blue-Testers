import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch events' },
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

    console.log('Creating event for user:', user.id);

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
        { error: 'Only organizers and admins can create events', currentRole: userProfile.role },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!body.title || !body.start_date || !body.end_date || !body.location) {
      return NextResponse.json(
        { error: 'Title, start date, end date, and location are required' },
        { status: 400 }
      );
    }

    console.log('Inserting event:', { title: body.title, organizer_id: user.id });

    const { data: event, error: insertError } = await supabase
      .from('events')
      .insert([
        {
          title: body.title,
          description: body.description,
          start_date: body.start_date,
          end_date: body.end_date,
          location: body.location,
          image_url: body.image_url,
          status: 'active', // New events are active by default
          organizer_id: user.id,
          attendee_count: 0,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting event:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to create event',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint || 'Check RLS policies for events table'
        },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event was not created' },
        { status: 500 }
      );
    }

    console.log('Event created successfully:', event.id);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating event:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create event',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
