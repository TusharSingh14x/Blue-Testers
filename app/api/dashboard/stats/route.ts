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

    // Get upcoming events count (events with start_date >= now)
    const { count: upcomingEventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_date', now)
      .eq('status', 'active');

    // Get user's active bookings count (confirmed or pending, not cancelled, end_time >= now)
    const { count: bookedResourcesCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('end_time', now)
      .in('status', ['confirmed', 'pending']);

    // Get user's communities joined count
    const { count: communitiesJoinedCount } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get resource usage percentage (active bookings / total resources)
    const { count: totalResources } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('end_time', now)
      .in('status', ['confirmed', 'pending']);

    const resourceUsage = totalResources && totalResources > 0
      ? Math.round((activeBookings || 0) / totalResources * 100)
      : 0;

    // Get recent events (upcoming, limit 3)
    const { data: recentEvents } = await supabase
      .from('events')
      .select('id, title, start_date, location, status')
      .gte('start_date', now)
      .eq('status', 'active')
      .order('start_date', { ascending: true })
      .limit(3);

    // Get user's recent bookings (active, limit 3)
    const { data: userBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        resource:resources(id, name, type)
      `)
      .eq('user_id', user.id)
      .gte('end_time', now)
      .in('status', ['confirmed', 'pending'])
      .order('start_time', { ascending: true })
      .limit(3);

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

