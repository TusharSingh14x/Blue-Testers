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

    // Check if user is admin or organizer (analytics should be restricted)
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'organizer'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only admins and organizers can view analytics' },
        { status: 403 }
      );
    }

    // Get total events count
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'past']);

    // Get total attendees count (sum of all event attendees)
    const { count: totalAttendees } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true });

    // Get total bookings count
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['confirmed', 'pending', 'completed']);

    // Get events from last 6 months for monthly data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: recentEvents } = await supabase
      .from('events')
      .select('id, start_date, attendee_count')
      .gte('start_date', sixMonthsAgo.toISOString())
      .in('status', ['active', 'past'])
      .order('start_date', { ascending: true });

    // Group events by month and calculate attendees
    const monthlyData: { [key: string]: { events: number; attendees: number } } = {};
    
    if (recentEvents) {
      for (const event of recentEvents) {
        const date = new Date(event.start_date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { events: 0, attendees: 0 };
        }
        monthlyData[monthKey].events += 1;
        monthlyData[monthKey].attendees += event.attendee_count || 0;
      }
    }

    // Convert to array format for charts (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const eventData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      eventData.push({
        month: monthKey,
        events: monthlyData[monthKey]?.events || 0,
        attendees: monthlyData[monthKey]?.attendees || 0,
      });
    }

    // Get resource type distribution
    const { data: resources } = await supabase
      .from('resources')
      .select('resource_type')
      .eq('status', 'approved');

    const resourceTypeCounts: { [key: string]: number } = {};
    if (resources) {
      for (const resource of resources) {
        const type = resource.resource_type;
        resourceTypeCounts[type] = (resourceTypeCounts[type] || 0) + 1;
      }
    }

    // Convert to pie chart format
    const totalResources = Object.values(resourceTypeCounts).reduce((sum, count) => sum + count, 0);
    const resourceData = Object.entries(resourceTypeCounts).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      value: totalResources > 0 ? Math.round((count / totalResources) * 100) : 0,
    }));

    // Calculate previous month stats for comparison
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Events comparison
    const { count: currentMonthEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_date', oneMonthAgo.toISOString())
      .in('status', ['active', 'past']);

    const { count: previousMonthEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_date', twoMonthsAgo.toISOString())
      .lt('start_date', oneMonthAgo.toISOString())
      .in('status', ['active', 'past']);

    const eventsChange = previousMonthEvents && previousMonthEvents > 0
      ? Math.round(((currentMonthEvents || 0) - previousMonthEvents) / previousMonthEvents * 100)
      : 0;

    // Attendees comparison
    const { count: currentMonthAttendees } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .gte('registered_at', oneMonthAgo.toISOString());

    const { count: previousMonthAttendees } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .gte('registered_at', twoMonthsAgo.toISOString())
      .lt('registered_at', oneMonthAgo.toISOString());

    const attendeesChange = previousMonthAttendees && previousMonthAttendees > 0
      ? Math.round(((currentMonthAttendees || 0) - previousMonthAttendees) / previousMonthAttendees * 100)
      : 0;

    // Bookings comparison
    const { count: currentMonthBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo.toISOString())
      .in('status', ['confirmed', 'pending', 'completed']);

    const { count: previousMonthBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', oneMonthAgo.toISOString())
      .in('status', ['confirmed', 'pending', 'completed']);

    const bookingsChange = previousMonthBookings && previousMonthBookings > 0
      ? Math.round(((currentMonthBookings || 0) - previousMonthBookings) / previousMonthBookings * 100)
      : 0;

    return NextResponse.json({
      stats: {
        totalEvents: totalEvents || 0,
        totalAttendees: totalAttendees || 0,
        totalBookings: totalBookings || 0,
        avgSatisfaction: '4.6/5', // Placeholder - can be calculated from feedback if available
      },
      changes: {
        events: eventsChange,
        attendees: attendeesChange,
        bookings: bookingsChange,
        satisfaction: 0.2, // Placeholder
      },
      eventData,
      resourceData,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

