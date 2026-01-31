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

    // Initial declaration removed to avoid redeclaration error


    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [
      eventNotifications,
      bookingNotifications,
      approvalNotifications,
      messageNotifications
    ] = await Promise.all([
      // 1. Upcoming events
      (async () => {
        const { data: eventAttendees } = await supabase
          .from('event_attendees')
          .select('event_id')
          .eq('user_id', user.id);

        if (!eventAttendees || eventAttendees.length === 0) return [];

        const eventIds = eventAttendees.map(ea => ea.event_id);
        const { data: events } = await supabase
          .from('events')
          .select('id, title, start_date, location')
          .in('id', eventIds)
          .gte('start_date', now.toISOString())
          .lte('start_date', oneDayFromNow.toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        return (events || []).map(event => {
          const startDate = new Date(event.start_date);
          const hoursUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));
          return {
            id: `event-${event.id}`,
            type: 'event',
            title: 'Upcoming Event',
            message: `${event.title} starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`,
            link: `/dashboard/events/${event.id}`,
            time: event.start_date,
            unread: true,
          };
        });
      })(),

      // 2. Recent resource bookings
      (async () => {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, start_time, resource_id')
          .eq('user_id', user.id)
          .in('status', ['confirmed', 'pending'])
          .gte('start_time', now.toISOString())
          .lte('start_time', oneDayFromNow.toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        if (!bookings || bookings.length === 0) return [];

        const resourceIds = bookings.map(b => b.resource_id);
        const { data: resources } = await supabase
          .from('resources')
          .select('id, name')
          .in('id', resourceIds);

        const resourceMap = new Map((resources || []).map(r => [r.id, r]));
        const results = [];

        for (const booking of bookings) {
          const resource = resourceMap.get(booking.resource_id);
          if (resource) {
            const startTime = new Date(booking.start_time);
            const hoursUntil = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
            results.push({
              id: `booking-${booking.id}`,
              type: 'booking',
              title: 'Upcoming Booking',
              message: `Your booking for ${resource.name} starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`,
              link: `/dashboard/resources/${resource.id}`,
              time: booking.start_time,
              unread: true,
            });
          }
        }
        return results;
      })(),

      // 3. Pending resource approvals
      (async () => {
        if (userProfile?.role !== 'admin') return [];

        const { count: pendingResources } = await supabase
          .from('resources')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (pendingResources && pendingResources > 0) {
          return [{
            id: 'pending-approvals',
            type: 'approval',
            title: 'Resource Approvals',
            message: `${pendingResources} resource${pendingResources !== 1 ? 's' : ''} pending approval`,
            link: '/dashboard/resources/approvals',
            time: now.toISOString(),
            unread: true,
          }];
        }
        return [];
      })(),

      // 4. Recent community messages
      (async () => {
        const { data: userCommunities } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id);

        if (!userCommunities || userCommunities.length === 0) return [];

        const communityIds = userCommunities.map(cm => cm.community_id);
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const { data: messages } = await supabase
          .from('community_messages')
          .select('id, message, created_at, community_id, user_id')
          .in('community_id', communityIds)
          .neq('user_id', user.id)
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (!messages || messages.length === 0) return [];

        const uniqueCommunityIds = [...new Set(messages.map(m => m.community_id))];
        const uniqueUserIds = [...new Set(messages.map(m => m.user_id))];

        const [
          { data: communities },
          { data: users }
        ] = await Promise.all([
          supabase.from('communities').select('id, name').in('id', uniqueCommunityIds),
          supabase.from('users').select('id, full_name').in('id', uniqueUserIds)
        ]);

        const communityMap = new Map((communities || []).map(c => [c.id, c]));
        const userMap = new Map((users || []).map(u => [u.id, u]));
        const results = [];

        for (const msg of messages) {
          const community = communityMap.get(msg.community_id);
          const sender = userMap.get(msg.user_id);

          if (community && sender) {
            results.push({
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
        return results;
      })()
    ]);

    const notifications = [
      ...eventNotifications,
      ...bookingNotifications,
      ...approvalNotifications,
      ...messageNotifications
    ];

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

