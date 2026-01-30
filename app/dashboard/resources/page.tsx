'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Clock, Users, MapPin, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRole } from '@/hooks/use-role';
import { useAuth } from '@/hooks/use-auth';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Resource {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  location: string;
  capacity: number;
  status: string;
  image_url?: string;
}

interface Booking {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  status: string;
  user: {
    full_name: string;
  };
}

export default function ResourcesPage() {
  const { isAdmin, canManageContent } = useRole();
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    description: '',
    resource_type: 'room',
    location: '',
    capacity: '',
    availability_start: '',
    availability_end: '',
  });

  useEffect(() => {
    fetchResources();
    fetchBookings();
  }, []);

  // Debug: Log bookings when they change
  useEffect(() => {
    if (bookings.length > 0) {
      console.log('Bookings loaded:', bookings.length, bookings);
    }
  }, [bookings]);

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources');
      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/resources/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageContent) {
      alert('Only organizers and admins can add resources');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newResource,
          capacity: newResource.capacity ? parseInt(newResource.capacity) : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewResource({
          name: '',
          description: '',
          resource_type: 'room',
          location: '',
          capacity: '',
          availability_start: '',
          availability_end: '',
        });
        await fetchResources();
        alert('Resource created successfully!');
      } else {
        const errorData = await response.json();
        console.error('Create resource error:', errorData);
        
        // Show detailed error message
        let errorMessage = `Failed to create resource: ${errorData.error || 'Unknown error'}`;
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
      console.error('Failed to create resource:', error);
      alert(`Failed to create resource: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setCreating(false);
    }
  };

  const getResourceBookings = (resourceId: string) => {
    return bookings.filter(b => 
      b.resource_id === resourceId && 
      b.status !== 'cancelled' &&
      (b.status === 'confirmed' || b.status === 'pending' || b.status === 'completed')
    );
  };

  const getCurrentBooking = (resourceId: string) => {
    const resourceBookings = getResourceBookings(resourceId);
    const now = new Date();
    
    return resourceBookings.find(booking => {
      try {
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        
        // Check if booking is currently active (now is between start and end)
        const isActive = now >= start && now <= end;
        
        if (isActive) {
          console.log('Found active booking:', {
            resourceId,
            start: start.toISOString(),
            end: end.toISOString(),
            now: now.toISOString(),
            status: booking.status
          });
        }
        
        return isActive;
      } catch (error) {
        console.error('Error parsing booking dates:', error, booking);
        return false;
      }
    });
  };

  const isResourceBooked = (resourceId: string) => {
    return !!getCurrentBooking(resourceId);
  };

  const getBookingStatus = (resourceId: string) => {
    const currentBooking = getCurrentBooking(resourceId);
    const now = new Date();
    
    if (currentBooking) {
      const endTime = new Date(currentBooking.end_time);
      const endDate = endTime.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const endTimeStr = endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
      return {
        status: 'booked',
        message: `Booked until ${endDate} at ${endTimeStr}`,
        availableAfter: endTime,
      };
    }
    
    // Check for upcoming bookings
    const resourceBookings = getResourceBookings(resourceId)
      .filter(b => new Date(b.end_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    if (resourceBookings.length === 0) {
      return {
        status: 'available',
        message: 'Available now',
        availableAfter: null,
      };
    }
    
    const nextBooking = resourceBookings[0];
    const nextStart = new Date(nextBooking.start_time);
    
    if (now < nextStart) {
      // Available now, but has upcoming booking
      const startDate = nextStart.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const startTimeStr = nextStart.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
      return {
        status: 'available',
        message: `Available until ${startDate} at ${startTimeStr}`,
        availableAfter: null,
      };
    }
    
    // Currently between bookings, find when next available
    const lastBooking = resourceBookings[resourceBookings.length - 1];
    const lastEnd = new Date(lastBooking.end_time);
    const endDate = lastEnd.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endTimeStr = lastEnd.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    return {
      status: 'available',
      message: `Available after ${endDate} at ${endTimeStr}`,
      availableAfter: lastEnd,
    };
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(search.toLowerCase()) ||
      resource.description?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || resource.resource_type === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Resources</h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? 'Manage campus resources' : canManageContent ? 'View and book resources' : 'View available resources'}
          </p>
        </div>
        {canManageContent && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
                Add Resource
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
            </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Resource Name</label>
                  <Input 
                    placeholder="Enter resource name" 
                    value={newResource.name}
                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea 
                    placeholder="Describe the resource..." 
                    value={newResource.description}
                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                  <Select 
                    value={newResource.resource_type}
                    onValueChange={(value) => setNewResource({ ...newResource, resource_type: value })}
                  >
                  <SelectTrigger>
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="venue">Venue</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input 
                    placeholder="Enter location" 
                    value={newResource.location}
                    onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                    required
                  />
                </div>
              <div>
                <label className="text-sm font-medium">Capacity</label>
                  <Input 
                    type="number" 
                    placeholder="Enter capacity" 
                    value={newResource.capacity}
                    onChange={(e) => setNewResource({ ...newResource, capacity: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Available From</label>
                    <Input 
                      type="time" 
                      value={newResource.availability_start}
                      onChange={(e) => setNewResource({ ...newResource, availability_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Available Until</label>
                    <Input 
                      type="time" 
                      value={newResource.availability_end}
                      onChange={(e) => setNewResource({ ...newResource, availability_end: e.target.value })}
                    />
                  </div>
              </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? 'Adding...' : 'Add Resource'}
                </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search resources..."
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
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="room">Rooms</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="venue">Venues</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">No resources found</p>
            </CardContent>
          </Card>
        ) : (
          filteredResources.map((resource) => {
            const booked = isResourceBooked(resource.id);
            const bookingStatus = getBookingStatus(resource.id);
            const resourceBookings = getResourceBookings(resource.id);

            return (
          <Card key={resource.id} className={`hover:shadow-md transition-shadow ${booked ? 'border-orange-200 bg-orange-50/30' : ''}`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                        <Link href={`/dashboard/resources/${resource.id}`}>
                          <h3 className="text-lg font-semibold text-slate-900 hover:text-blue-600 cursor-pointer">
                            {resource.name}
                          </h3>
                        </Link>
                        <Badge variant={booked ? 'destructive' : 'default'} className={booked ? 'bg-red-600' : 'bg-green-600'}>
                          {booked ? 'Booked' : 'Available'}
                        </Badge>
                  </div>
                      <p className="text-sm text-slate-600 mt-1 capitalize">{resource.resource_type}</p>
                      {resource.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{resource.description}</p>
                      )}
                </div>

                <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={16} />
                        {resource.location}
                      </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users size={16} />
                    Capacity: {resource.capacity}
                  </div>
                  <div className={`flex items-center gap-2 ${booked ? 'text-red-700 font-medium' : 'text-slate-600'}`}>
                    <Clock size={16} className={booked ? 'text-red-600' : ''} />
                    <span>{bookingStatus.message}</span>
                  </div>
                      {resourceBookings.length > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar size={16} />
                          {resourceBookings.length} booking{resourceBookings.length > 1 ? 's' : ''}
                  </div>
                      )}
                </div>

                    {booked ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-orange-900">
                          Currently booked
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          {bookingStatus.message}
                        </p>
                      </div>
                    ) : canManageContent ? (
                      <Link href={`/dashboard/resources/${resource.id}?book=true`}>
                        <Button className="w-full">Book Resource</Button>
                      </Link>
                    ) : (
                      <p className="text-xs text-slate-500 text-center">
                        Only organizers can book resources
                      </p>
                    )}
              </div>
            </CardContent>
          </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
