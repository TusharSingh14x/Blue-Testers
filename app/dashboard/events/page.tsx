'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calendar, MapPin, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRole } from '@/hooks/use-role';
import { Textarea } from '@/components/ui/textarea';

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
}

export default function EventsPage() {
  const { canManageContent } = useRole();
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    image_url: '',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageContent) {
      alert('Only organizers and admins can create events');
      return;
    }

    setCreating(true);
    try {
      console.log('Creating event:', newEvent);
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      });

      if (response.ok) {
        const event = await response.json();
        setNewEvent({
          title: '',
          description: '',
          start_date: '',
          end_date: '',
          location: '',
          image_url: '',
        });
        await fetchEvents();
        router.push(`/dashboard/events/${event.id}`);
      } else {
        const errorData = await response.json();
        console.error('Create event error:', errorData);
        
        // Show detailed error message
        let errorMessage = `Failed to create event: ${errorData.error || 'Unknown error'}`;
        if (errorData.details) {
          errorMessage += `\n\nDetails: ${errorData.details}`;
        }
        if (errorData.hint) {
          errorMessage += `\n\nHint: ${errorData.hint}`;
        }
        if (errorData.code) {
          errorMessage += `\n\nError Code: ${errorData.code}`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      alert(`Failed to create event: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
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

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.description?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || event.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-600 mt-1">Create and manage campus events</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={20} />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Event Title</label>
                <Input 
                  placeholder="Enter event title" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  placeholder="Describe your event..." 
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start Date & Time</label>
                <Input 
                  type="datetime-local" 
                  value={newEvent.start_date}
                  onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date & Time</label>
                <Input 
                  type="datetime-local" 
                  value={newEvent.end_date}
                  onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input 
                  placeholder="Enter location" 
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Event Image URL (Optional)</label>
                <Input 
                  type="url"
                  placeholder="https://example.com/image.jpg" 
                  value={newEvent.image_url}
                  onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Add an image URL to display on the event page
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Event'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">No events found</p>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                      <Link href={`/dashboard/events/${event.id}`}>
                        <h3 className="text-lg font-semibold text-slate-900 hover:text-blue-600 cursor-pointer">
                          {event.title}
                        </h3>
                      </Link>
                    <span
                        className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                          event.status === 'active'
                          ? 'bg-green-100 text-green-700'
                            : event.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                    {event.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                        {formatDate(event.start_date)} at {formatTime(event.start_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                        {event.attendee_count || 0} attendees
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/events/${event.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
                  </Link>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
}
