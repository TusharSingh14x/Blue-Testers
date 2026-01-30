'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Community {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

export default function CommunitiesPage() {
  const { user, profile } = useAuth();
  const { canManageContent, role } = useRole();
  const router = useRouter();
  
  // Debug logging
  useEffect(() => {
    console.log('Communities Page - User role:', role);
    console.log('Communities Page - Profile:', profile);
    console.log('Communities Page - canManageContent:', canManageContent);
  }, [role, profile, canManageContent]);
  const [search, setSearch] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCommunities();
    fetchJoinedCommunities();
    ensureGeneralCommunity();
  }, [user]);

  const ensureGeneralCommunity = async () => {
    // Only organizers/admins can create the General community
    if (!canManageContent) return;
    
    // Check if General community exists, if not, create it
    try {
      const response = await fetch('/api/communities');
      if (response.ok) {
        const communities = await response.json();
        const generalExists = communities.some((c: Community) => c.name === 'General');
        
        if (!generalExists) {
          // Only organizers/admins can trigger creation
          const initResponse = await fetch('/api/communities/init', {
            method: 'POST',
          });
          if (initResponse.ok) {
            await fetchCommunities();
            await fetchJoinedCommunities();
          }
        }
      }
    } catch (error) {
      console.error('Failed to ensure General community:', error);
    }
  };

  const fetchCommunities = async () => {
    try {
      const response = await fetch('/api/communities');
      if (response.ok) {
        const data = await response.json();
        setCommunities(data);
        // Only organizers/admins can create General community
        // Regular users will just see it if it exists
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinedCommunities = async () => {
    if (!user) return;
    
    try {
      // Fetch all memberships in a single API call
      const response = await fetch('/api/communities/memberships');
      if (response.ok) {
        const data = await response.json();
        setJoinedCommunities(new Set(data.memberships || []));
      } else {
        console.error('Failed to fetch memberships:', await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch joined communities:', error);
    }
  };

  const handleJoin = async (communityId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const response = await fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
      });

      if (response.ok) {
        // Optimistically update the UI immediately
        setJoinedCommunities(prev => new Set(prev).add(communityId));
        // Refresh communities to update member counts
        await fetchCommunities();
        // Refresh memberships in the background (non-blocking)
        fetchJoinedCommunities().catch(console.error);
        // Navigate to the community page after joining
        router.push(`/dashboard/communities/${communityId}`);
      } else {
        const error = await response.json();
        alert(`Failed to join: ${error.error}`);
        // Revert optimistic update on error
        setJoinedCommunities(prev => {
          const updated = new Set(prev);
          updated.delete(communityId);
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to join community:', error);
      alert('Failed to join community');
      // Revert optimistic update on error
      setJoinedCommunities(prev => {
        const updated = new Set(prev);
        updated.delete(communityId);
        return updated;
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageContent) {
      alert('Only organizers and admins can create communities');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCommunity),
      });

      if (response.ok) {
        const community = await response.json();
        setNewCommunity({ name: '', description: '' });
        await fetchCommunities();
        router.push(`/dashboard/communities/${community.id}`);
      } else {
        const error = await response.json();
        alert(`Failed to create community: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create community:', error);
      alert('Failed to create community');
    } finally {
      setCreating(false);
    }
  };

  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Communities</h1>
          <p className="text-slate-600 mt-1">Join and manage campus communities</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={20} />
              Create Community
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Community Name</label>
                <Input 
                  placeholder="Enter community name" 
                  value={newCommunity.name}
                  onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  placeholder="What is this community about?" 
                  value={newCommunity.description}
                  onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Community'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <Input
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* General Community - Prominent Display */}
      {(() => {
        const generalCommunity = filteredCommunities.find(c => c.name === 'General');
        if (!generalCommunity) {
          // Show a placeholder if General doesn't exist yet
          // Only organizers/admins can create it
          if (canManageContent) {
            return (
              <Card className="border-2 border-blue-500 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-blue-900">General Chatroom</h3>
                        <Badge className="bg-blue-600 text-white">Create Now</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mb-4">
                        Create the General chatroom for all campus members to connect and communicate.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        ensureGeneralCommunity().then(() => {
                          fetchCommunities();
                          fetchJoinedCommunities();
                        });
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create General Chatroom
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          } else {
            // Regular users see a message that it's not created yet
            return (
              <Card className="border-2 border-blue-500 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-blue-900">General Chatroom</h3>
                      <Badge className="bg-blue-600 text-white">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-blue-700">
                      The General chatroom hasn't been created yet. Please ask an organizer or admin to create it.
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          }
        }
        
        const generalId = generalCommunity.id;
        const isJoined = joinedCommunities.has(generalId);
        
        return (
          <Card className="border-2 border-blue-500 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-blue-900">General Chatroom</h3>
                    <Badge className="bg-blue-600 text-white">Everyone Welcome</Badge>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    Join the general chatroom to connect with all campus members!
                  </p>
                  <div className="flex items-center gap-1 text-blue-600 mb-4">
                    <Users size={16} />
                    <span className="text-sm font-medium">
                      {generalCommunity.member_count || 0} members
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isJoined ? (
                    <Link href={`/dashboard/communities/${generalId}`}>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Open General Chatroom
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => handleJoin(generalId)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Join General Chatroom
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCommunities
          .filter(community => community.name !== 'General')
          .map((community) => {
            const isJoined = joinedCommunities.has(community.id);
          return (
            <Card key={community.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                      <Link href={`/dashboard/communities/${community.id}`}>
                        <h3 className="text-lg font-semibold text-slate-900 hover:text-blue-600 cursor-pointer">
                          {community.name}
                        </h3>
                      </Link>
                    <p className="text-sm text-slate-600 mt-1">{community.description}</p>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Users size={16} />
                        <span>{community.member_count} members</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/dashboard/communities/${community.id}`} className="flex-1">
                        <Button
                          variant={isJoined ? 'default' : 'outline'}
                          className="w-full"
                        >
                          {isJoined ? 'Open Chatroom' : 'View Details'}
                        </Button>
                      </Link>
                      {!isJoined && (
                        <Button
                          onClick={() => handleJoin(community.id)}
                          className="flex-1"
                        >
                          Join Now
                        </Button>
                      )}
                    </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCommunities.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 mb-4">No communities found</p>
            {canManageContent && (
              <Button onClick={ensureGeneralCommunity}>
                Create General Community
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
