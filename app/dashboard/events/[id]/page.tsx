'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  MapPin,
  Users,
  Share2,
  Clock,
  Edit,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  attendee_count: number;
  image_url?: string;
  organizer?: {
    id: string;
    full_name: string;
    email: string;
  };
  community?: {
    id: string;
    name: string;
  };
}

interface Attendee {
  id: string;
  user_id: string;
  registered_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Unwrap params if it's a Promise (Next.js 15)
  const resolvedParams = 'then' in params ? use(params) : params;
  const eventId = resolvedParams.id;

  const { user } = useAuth();
  const { canManageContent } = useRole();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchEvent();
    fetchAttendees();
    checkAttendance();
  }, [eventId, user]);

  const fetchEvent = async () => {
    try {
      console.log('Fetching event:', eventId);
      const response = await fetch(`/api/events/${eventId}?t=${new Date().getTime()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Event fetched:', data);
        setEvent(data);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch event:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/attendees?t=${new Date().getTime()}`);
      if (response.ok) {
        const data = await response.json();
        setAttendees(data);
      } else {
        console.error('Failed to fetch attendees:', await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
    }
  };

  const checkAttendance = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/events/${eventId}/attendees?t=${new Date().getTime()}`);
      if (response.ok) {
        const data = await response.json();
        const userAttendee = data.find((a: Attendee) => a.user_id === user.id);
        setIsAttending(!!userAttendee);
      }
    } catch (error) {
      console.error('Failed to check attendance:', error);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setRegistering(true);
    try {
      const method = isAttending ? 'DELETE' : 'POST';
      console.log(`Attempting to ${isAttending ? 'unregister' : 'register'} for event:`, eventId);

      const response = await fetch(`/api/events/${eventId}/attendees`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();
      console.log('Registration response:', { status: response.status, data: responseData });

      if (response.ok) {
        setIsAttending(!isAttending);
        await fetchEvent();
        await fetchAttendees();
        console.log(`Successfully ${isAttending ? 'unregistered' : 'registered'} for event`);
      } else {
        console.error('Register error:', responseData);
        const errorMessage = responseData.error || responseData.message || 'Unknown error';
        alert(`Failed to ${isAttending ? 'unregister' : 'register'}: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Failed to register:', error);
      alert(`Failed to ${isAttending ? 'unregister' : 'register'} for event. Please try again.`);
    } finally {
      setRegistering(false);
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const copyToClipboard = async () => {
    const shareUrl = `${window.location.origin}/dashboard/events/${eventId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/events/${eventId}` : '';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) return `${minutes} minutes`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 mb-4">Event not found</p>
        <Link href="/dashboard/events">
          <Button>
            <ArrowLeft size={16} className="mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div className="flex-1" />
        {canManageContent && event.organizer?.id === user?.id && (
          <Button variant="outline" size="sm">
            <Edit size={16} className="mr-2" />
            Edit Event
          </Button>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white relative overflow-hidden">
        {event.image_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${event.image_url})` }}
          />
        )}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-white text-blue-600 capitalize">
                {event.status}
              </Badge>
              {event.community && (
                <Badge variant="secondary" className="bg-white text-blue-600">
                  {event.community.name}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl font-bold">{event.title}</h1>
            {event.organizer && (
              <p className="text-blue-100 mt-2">Organized by {event.organizer.full_name}</p>
            )}
          </div>
        </div>
      </div>

      {event.image_url && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar size={20} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(event.start_date)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatTime(event.start_date)} - {formatTime(event.end_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock size={20} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Duration</p>
                    <p className="text-xs text-slate-600">
                      {formatDuration(event.start_date, event.end_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={20} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{event.location}</p>
                  </div>
                </div>
              </div>
              {event.description && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-slate-900 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="attendees" className="space-y-4">
            <TabsList>
              <TabsTrigger value="attendees">
                Attendees ({event.attendee_count || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendees" className="space-y-4">
              {attendees.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-slate-600">No attendees yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {attendees.slice(0, 12).map((attendee) => (
                    <Card key={attendee.id}>
                      <CardContent className="pt-6 text-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-medium">
                          {attendee.user?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <p className="font-medium text-slate-900 text-sm">
                          {attendee.user?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">Attending</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {attendees.length > 12 && (
                <Button variant="outline" className="w-full">
                  View All {attendees.length} Attendees
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Attendees</span>
                  <span className="text-sm font-medium text-slate-900">
                    {event.attendee_count || 0}
                  </span>
                </div>
              </div>
              <Button
                onClick={handleRegister}
                className="w-full"
                variant={isAttending ? 'outline' : 'default'}
                disabled={registering}
              >
                {registering
                  ? 'Processing...'
                  : isAttending
                    ? 'Cancel Registration'
                    : 'Register for Event'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-slate-600 hover:text-blue-600 w-full transition-colors"
                  >
                    <Share2 size={20} />
                    <span>Share Event</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Event</DialogTitle>
                    <DialogDescription>
                      Share this event with others by copying the link below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        {linkCopied ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </Button>
                    </div>
                    {linkCopied && (
                      <p className="text-sm text-green-600">Link copied to clipboard!</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (navigator.share && event) {
                            navigator.share({
                              title: event.title,
                              text: `Check out this event: ${event.title}`,
                              url: shareUrl,
                            }).catch(console.error);
                          }
                        }}
                        variant="outline"
                        className="flex-1"
                        disabled={!navigator.share}
                      >
                        Share via...
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {event.organizer && (
            <Card>
              <CardHeader>
                <CardTitle>Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-slate-900">
                  {event.organizer.full_name}
                </p>
                <p className="text-xs text-slate-600 mt-1">{event.organizer.email}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
