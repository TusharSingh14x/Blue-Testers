'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, MapPin, AlertCircle, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRole } from '@/hooks/use-role';
import { useAuth } from '@/hooks/use-auth';

interface Resource {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  location: string;
  capacity: number;
  status: string;
  image_url?: string;
  availability_start?: string;
  availability_end?: string;
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  purpose?: string;
  user: {
    full_name: string;
  };
}

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Unwrap params if it's a Promise (Next.js 15)
  const resolvedParams = 'then' in params ? use(params) : params;
  const resourceId = resolvedParams.id;

  const { canManageContent } = useRole();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showBookDialog = searchParams?.get('book') === 'true';

  const [resource, setResource] = useState<Resource | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    start_time: '',
    end_time: '',
    purpose: '',
  });

  useEffect(() => {
    fetchResource();
    fetchBookings();
  }, [resourceId]);

  const fetchResource = async () => {
    try {
      const response = await fetch(`/api/resources/${resourceId}`);
      if (response.ok) {
        const data = await response.json();
        setResource(data);
      }
    } catch (error) {
      console.error('Failed to fetch resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/resources/bookings?resource_id=${resourceId}`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageContent) {
      alert('Only organizers and admins can book resources');
      return;
    }

    setBooking(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resource_id: resourceId,
          ...newBooking,
        }),
      });

      if (response.ok) {
        setNewBooking({
          start_time: '',
          end_time: '',
          purpose: '',
        });
        await fetchBookings();
        await fetchResource();
        router.push(`/dashboard/resources/${resourceId}`);
        alert('Resource booked successfully!');
      } else {
        const errorData = await response.json();
        console.error('Booking error:', errorData);
        alert(`Failed to book resource: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to book resource:', error);
      alert('Failed to book resource. Please check the console for details.');
    } finally {
      setBooking(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading resource...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 mb-4">Resource not found</p>
        <Link href="/dashboard/resources">
          <Button>
            <ArrowLeft size={16} className="mr-2" />
            Back to Resources
          </Button>
        </Link>
      </div>
    );
    }

  const getCurrentBooking = () => {
    const now = new Date();
    return bookings.find(b => {
      // Only check confirmed, pending, or completed bookings (not cancelled)
      if (b.status === 'cancelled') return false;
      
      try {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        const isActive = now >= start && now <= end;
        
        if (isActive) {
          console.log('Found active booking on detail page:', {
            start: start.toISOString(),
            end: end.toISOString(),
            now: now.toISOString(),
            status: b.status
          });
        }
        
        return isActive;
      } catch (error) {
        console.error('Error parsing booking dates:', error, b);
        return false;
      }
    });
  };

  const isCurrentlyBooked = !!getCurrentBooking();

  const getBookingDeadline = () => {
    const currentBooking = getCurrentBooking();
    if (!currentBooking) return null;
    
    const endTime = new Date(currentBooking.end_time);
    return {
      date: endTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      }),
      datetime: endTime,
    };
  };

  const bookingDeadline = getBookingDeadline();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/resources">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div className="flex-1" />
        {canManageContent && !isCurrentlyBooked && (
          <Dialog open={showBookDialog || false}>
            <DialogTrigger asChild>
              <Button>Book Resource</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Book {resource.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Start Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={newBooking.start_time}
                    onChange={(e) => setNewBooking({ ...newBooking, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={newBooking.end_time}
                    onChange={(e) => setNewBooking({ ...newBooking, end_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Purpose (Optional)</label>
                  <Input
                    placeholder="What is this booking for?"
                    value={newBooking.purpose}
                    onChange={(e) => setNewBooking({ ...newBooking, purpose: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={booking}>
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className={`bg-gradient-to-r rounded-lg p-8 text-white ${isCurrentlyBooked ? 'from-red-600 to-red-700' : 'from-green-600 to-green-700'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-white text-slate-700 capitalize">
                {resource.resource_type}
              </Badge>
              <Badge variant="secondary" className={isCurrentlyBooked ? 'bg-red-100 text-red-700' : 'bg-white text-green-600'}>
                {isCurrentlyBooked ? 'Currently Booked' : 'Available'}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold">{resource.name}</h1>
            <p className="text-white/90 mt-2 flex items-center gap-2">
              <MapPin size={20} />
              {resource.location}
            </p>
            {isCurrentlyBooked && bookingDeadline && (
              <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <p className="text-sm font-medium mb-1">Booking Deadline</p>
                <p className="text-lg font-bold">{bookingDeadline.date}</p>
                <p className="text-base">{bookingDeadline.time}</p>
                <p className="text-xs text-white/80 mt-2">
                  This resource will be available again after this time
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About This Resource</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resource.description && (
                <p className="text-slate-600">{resource.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Capacity</p>
                    <p className="text-xs text-slate-600">{resource.capacity} people</p>
                  </div>
                </div>
                {resource.availability_start && resource.availability_end && (
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-blue-600" />
                  <div>
                      <p className="text-sm font-medium text-slate-900">Available Hours</p>
                      <p className="text-xs text-slate-600">
                        {resource.availability_start} - {resource.availability_end}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="bookings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="bookings">Booking History</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="text-center text-slate-600 py-8">No bookings yet</p>
                  ) : (
                    bookings.map((booking) => {
                      const start = formatDateTime(booking.start_time);
                      const end = formatDateTime(booking.end_time);
                      return (
                        <div key={booking.id} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div>
                              <p className="font-medium text-slate-900 text-sm">{start.date}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {start.time} - {end.time}
                              </p>
                              {booking.user && (
                                <p className="text-xs text-slate-600">Booked by {booking.user.full_name}</p>
                              )}
                              {booking.purpose && (
                                <p className="text-xs text-slate-500 mt-1">Purpose: {booking.purpose}</p>
                              )}
                        </div>
                        <Badge
                          variant={
                            booking.status === 'completed'
                              ? 'default'
                              : booking.status === 'confirmed'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canManageContent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    Only organizers and admins can book resources. Contact an organizer to book this resource.
                    </p>
                  </div>
              )}
              {isCurrentlyBooked && bookingDeadline && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900 mb-1">Currently Booked</p>
                      <p className="text-xs text-red-700 mb-2">
                        This resource is currently in use
                      </p>
                      <div className="bg-white rounded p-2 border border-red-200">
                        <p className="text-xs font-medium text-red-900 mb-1">Available After:</p>
                        <p className="text-sm font-bold text-red-700">{bookingDeadline.date}</p>
                        <p className="text-sm text-red-600">{bookingDeadline.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <p className="text-lg font-bold text-slate-900 mt-1 capitalize">
                  {resource.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Bookings</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {bookings.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
