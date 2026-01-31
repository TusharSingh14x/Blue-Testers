'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Chatbot } from '@/components/Chatbot';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Community {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

export default function CommunitiesPage() {
  const { user, profile } = useAuth();
  const { canManageContent, role, loading: authLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();

  const isAdmin = role === 'admin';

  // Debug logging
  useEffect(() => {
    console.log('Communities Page - User role:', role);
    console.log('Communities Page - isAdmin:', isAdmin);
    console.log('Communities Page - authLoading:', authLoading);
  }, [role, isAdmin, authLoading]);
  const [search, setSearch] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: '', description: '' });

  // Delete state
  const [communityToDelete, setCommunityToDelete] = useState<string | null>(null);

  const fetchCommunities = async () => {
    try {
      const response = await fetch('/api/communities');
      if (response.ok) {
        const data = await response.json();
        setCommunities(data);
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
      const response = await fetch('/api/communities/memberships');
      if (response.ok) {
        const data = await response.json();
        setJoinedCommunities(new Set(data.memberships || []));
      }
    } catch (error) {
      console.error('Failed to fetch joined communities:', error);
    }
  };

  const ensureGeneralCommunity = async () => {
    if (!canManageContent) return;

    try {
      const response = await fetch('/api/communities');
      if (response.ok) {
        const communities = await response.json();
        const generalExists = communities.some((c: Community) => c.name === 'General');

        if (!generalExists) {
          const initResponse = await fetch('/api/communities/init', { method: 'POST' });
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

  useEffect(() => {
    fetchCommunities();
    fetchJoinedCommunities();
    ensureGeneralCommunity();
  }, [user]);

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
        setJoinedCommunities(prev => new Set(prev).add(communityId));
        toast({
          title: 'Joined Community',
          description: 'You have successfully joined the community.',
        });
        await fetchCommunities();
        fetchJoinedCommunities().catch(console.error);
        router.push(`/dashboard/communities/${communityId}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: `Failed to join: ${error.error}`,
          variant: 'destructive',
        });
        setJoinedCommunities(prev => {
          const updated = new Set(prev);
          updated.delete(communityId);
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to join community:', error);
      toast({
        title: 'Error',
        description: 'Failed to join community',
        variant: 'destructive',
      });
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
      toast({
        title: 'Permission Denied',
        description: 'Only organizers and admins can create communities',
        variant: 'destructive',
      });
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
        toast({
          title: 'Community Created',
          description: 'Your new community is ready!',
        });
        router.push(`/dashboard/communities/${community.id}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: `Failed to create community: ${error.error}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create community:', error);
      toast({
        title: 'Error',
        description: 'Failed to create community',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!communityToDelete) return;

    try {
      const response = await fetch(`/api/communities/${communityToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Community Deleted',
          description: 'The community has been permanently deleted.',
        });
        await fetchCommunities();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: `Failed to delete community: ${error.error}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete community:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete community',
        variant: 'destructive',
      });
    } finally {
      setCommunityToDelete(null);
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
              <Card key={community.id} className="hover:shadow-md transition-shadow relative">
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
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 z-10 shadow-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCommunityToDelete(community.id);
                    }}
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
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

      {/* AI Chat Assistant */}
      <Chatbot />

      <AlertDialog open={!!communityToDelete} onOpenChange={(open) => !open && setCommunityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this community? This action cannot be undone and will delete all messages and memberships associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleDeleteCommunity}
            >
              Delete Community
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
