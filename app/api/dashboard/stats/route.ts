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

    const now = new Date().toISOString();

    const [
      { count: upcomingEventsCount },
      { count: bookedResourcesCount },
      { count: communitiesJoinedCount },
      { count: totalResources },
      { count: activeBookings },
      { data: recentEvents },
      { data: userBookings },
    ] = await Promise.all([
      // Get upcoming events count
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', now)
        .eq('status', 'active'),

      // Get user's active bookings count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('end_time', now)
        .in('status', ['confirmed', 'pending']),

      // Get user's communities joined count
      supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Get total resources count
      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),

      // Get active bookings count (global)
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('end_time', now)
        .in('status', ['confirmed', 'pending']),

      // Get recent events
      supabase
        .from('events')
        .select('id, title, start_date, location, status')
        .gte('start_date', now)
        .eq('status', 'active')
        .order('start_date', { ascending: true })
        .limit(3),

      // Get user's recent bookings
      supabase
        .from('bookings')
        .select(`
          *,
          resource:resources(id, name, type)
        `)
        .eq('user_id', user.id)
        .gte('end_time', now)
        .in('status', ['confirmed', 'pending'])
        .order('start_time', { ascending: true })
        .limit(3),
    ]);

    const resourceUsage = totalResources && totalResources > 0
      ? Math.round((activeBookings || 0) / totalResources * 100)
      : 0;

    // Check which events user is attending
    const eventIds = recentEvents?.map(e => e.id) || [];
    let attendingEventIds: string[] = [];

    if (eventIds.length > 0) {
      const { data: eventAttendees } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('user_id', user.id)
        .in('event_id', eventIds);

      attendingEventIds = eventAttendees?.map(ea => ea.event_id) || [];
    }

    return NextResponse.json({
      stats: {
        upcomingEvents: upcomingEventsCount || 0,
        bookedResources: bookedResourcesCount || 0,
        communitiesJoined: communitiesJoinedCount || 0,
        resourceUsage: `${resourceUsage}%`,
      },
      recentEvents: recentEvents?.map(event => ({
        ...event,
        isAttending: attendingEventIds.includes(event.id),
      })) || [],
      userBookings: userBookings || [],
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

