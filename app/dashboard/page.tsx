'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, BookOpen, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  upcomingEvents: number;
  bookedResources: number;
  communitiesJoined: number;
  resourceUsage: string;
}

interface RecentEvent {
  id: string;
  title: string;
  start_date: string;
  location: string;
  isAttending?: boolean;
}

interface UserBooking {
  id: string;
  start_time: string;
  end_time: string;
  resource: {
    id: string;
    name: string;
    type: string;
  };
}

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingEvents: 0,
    bookedResources: 0,
    communitiesJoined: 0,
    resourceUsage: '0%',
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [userBookings, setUserBookings] = useState<UserBooking[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentEvents(data.recentEvents);
        setUserBookings(data.userBookings);
      } else {
        console.error('Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const statCards = [
    {
      label: 'Upcoming Events',
      value: stats.upcomingEvents.toString(),
      icon: Calendar,
      color: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Booked Resources',
      value: stats.bookedResources.toString(),
      icon: BookOpen,
      color: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Communities Joined',
      value: stats.communitiesJoined.toString(),
      icon: Users,
      color: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: 'Resource Usage',
      value: stats.resourceUsage,
      icon: TrendingUp,
      color: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {profile?.full_name || 'User'}!
        </h1>
        <p className="text-slate-600 mt-2">
          Here's what's happening in your campus community
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className={`${stat.textColor}`} size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No upcoming events</p>
                <Link href="/dashboard/events">
                  <Button variant="outline">Browse Events</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {recentEvents.map((event) => (
                    <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                      <div className="flex items-start justify-between border-b border-slate-200 pb-4 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer">
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {event.title}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {formatDate(event.start_date)}, {formatTime(event.start_date)} • {event.location}
                          </p>
                        </div>
                        {event.isAttending && (
                          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                            Attending
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/dashboard/events">
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    View All Events
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {userBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No active bookings</p>
                <Link href="/dashboard/resources">
                  <Button variant="outline">Browse Resources</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {userBookings.map((booking) => (
                    <Link key={booking.id} href={`/dashboard/resources/${booking.resource.id}`}>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                        <div className="text-sm flex-1">
                          <p className="font-medium text-slate-900">
                            {booking.resource.name}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {formatDate(booking.start_time)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </p>
                        </div>
                        <span className="w-2 h-2 bg-green-500 rounded-full ml-2"></span>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/dashboard/resources">
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    Browse Resources
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
