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

    // Get user profile to check role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      link: string;
      time: string;
      unread: boolean;
    }> = [];

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Upcoming events (events user is registered for, starting in next 24 hours)
    const { data: eventAttendees } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', user.id);

    let upcomingEvents: any[] = [];
    if (eventAttendees && eventAttendees.length > 0) {
      const eventIds = eventAttendees.map(ea => ea.event_id);
      const { data: events } = await supabase
        .from('events')
        .select('id, title, start_date, location')
        .in('id', eventIds)
        .gte('start_date', now.toISOString())
        .lte('start_date', oneDayFromNow.toISOString())
        .order('start_date', { ascending: true })
        .limit(5);
      upcomingEvents = events || [];
    }

    for (const event of upcomingEvents) {
      const startDate = new Date(event.start_date);
      const hoursUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      notifications.push({
        id: `event-${event.id}`,
        type: 'event',
        title: 'Upcoming Event',
        message: `${event.title} starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`,
        link: `/dashboard/events/${event.id}`,
        time: event.start_date,
        unread: true,
      });
    }

    // 2. Recent resource bookings (user's bookings starting soon)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, start_time, resource_id')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', now.toISOString())
      .lte('start_time', oneDayFromNow.toISOString())
      .order('start_time', { ascending: true })
      .limit(5);

    const upcomingBookings: any[] = [];
    if (bookings && bookings.length > 0) {
      const resourceIds = bookings.map(b => b.resource_id);
      const { data: resources } = await supabase
        .from('resources')
        .select('id, name')
        .in('id', resourceIds);

      const resourceMap = new Map((resources || []).map(r => [r.id, r]));
      
      for (const booking of bookings) {
        const resource = resourceMap.get(booking.resource_id);
        if (resource) {
          upcomingBookings.push({
            ...booking,
            resource,
          });
        }
      }
    }

    for (const booking of upcomingBookings) {
      const startTime = new Date(booking.start_time);
      const hoursUntil = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      notifications.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        title: 'Upcoming Booking',
        message: `Your booking for ${booking.resource.name} starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`,
        link: `/dashboard/resources/${booking.resource.id}`,
        time: booking.start_time,
        unread: true,
      });
    }

    // 3. Pending resource approvals (for admins only)
    if (userProfile?.role === 'admin') {
      const { count: pendingResources } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingResources && pendingResources > 0) {
        notifications.push({
          id: 'pending-approvals',
          type: 'approval',
          title: 'Resource Approvals',
          message: `${pendingResources} resource${pendingResources !== 1 ? 's' : ''} pending approval`,
          link: '/dashboard/resources/approvals',
          time: now.toISOString(),
          unread: true,
        });
      }
    }

    // 4. Recent community messages (messages from communities user is in, from last 24 hours)
    const { data: userCommunities } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);

    if (userCommunities && userCommunities.length > 0) {
      const communityIds = userCommunities.map(cm => cm.community_id);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data: messages } = await supabase
        .from('community_messages')
        .select('id, message, created_at, community_id, user_id')
        .in('community_id', communityIds)
        .neq('user_id', user.id) // Don't show own messages
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (messages && messages.length > 0) {
        const uniqueCommunityIds = [...new Set(messages.map(m => m.community_id))];
        const uniqueUserIds = [...new Set(messages.map(m => m.user_id))];

        const { data: communities } = await supabase
          .from('communities')
          .select('id, name')
          .in('id', uniqueCommunityIds);

        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', uniqueUserIds);

        const communityMap = new Map((communities || []).map(c => [c.id, c]));
        const userMap = new Map((users || []).map(u => [u.id, u]));

        for (const msg of messages) {
          const community = communityMap.get(msg.community_id);
          const sender = userMap.get(msg.user_id);
          
          if (community && sender) {
            notifications.push({
              id: `message-${msg.id}`,
              type: 'message',
              title: `New message in ${community.name}`,
              message: `${sender.full_name}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`,
              link: `/dashboard/communities/${community.id}`,
              time: msg.created_at,
              unread: true,
            });
          }
        }
      }
    }

    // Sort by time (most recent first)
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      notifications: notifications.slice(0, 10), // Limit to 10 most recent
      unreadCount: notifications.filter(n => n.unread).length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

