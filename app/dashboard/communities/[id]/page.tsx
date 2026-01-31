'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, Calendar, Trash2 } from 'lucide-react';
import { Chatroom } from '@/components/chatroom';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import Link from 'next/link';
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
  created_by: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: {
    full_name: string;
    avatar_url?: string;
  };
}

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Unwrap params if it's a Promise (Next.js 15)
  const resolvedParams = 'then' in params ? use(params) : params;
  const communityId = resolvedParams.id;

  const { user } = useAuth();
  const { role, loading: authLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // State for delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    console.log('Current User Role:', role); // Debugging
    fetchCommunity();
    checkMembership();
    fetchMembers();
  }, [communityId, user, role]);

  const fetchCommunity = async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}`);
      if (response.ok) {
        const data = await response.json();
        setCommunity(data);
      }
    } catch (error) {
      console.error('Failed to fetch community:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/communities/${communityId}/members`);
      if (response.ok) {
        const data = await response.json();
        const userMember = data.find((m: Member) => m.user_id === user.id);
        setIsJoined(!!userMember);
      }
    } catch (error) {
      console.error('Failed to check membership:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
      });

      if (response.ok) {
        setIsJoined(true);
        await fetchCommunity();
        await fetchMembers();
      } else {
        const errorData = await response.json();
        console.error('Join error:', errorData);
        alert(`Failed to join: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to join community:', error);
      alert('Failed to join community. Please check the console for details.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    console.log('Attempting to leave community:', communityId);
    if (!confirm('Are you sure you want to leave this community?')) return;

    try {
      const response = await fetch(`/api/communities/${communityId}/join`, {
        method: 'DELETE',
      });

      console.log('Leave response status:', response.status);

      if (response.ok) {
        setIsJoined(false);
        await fetchCommunity();
        await fetchMembers();
        toast({
          title: 'Left Community',
          description: 'You have left the community.',
        });
      } else {
        const errorData = await response.json();
        console.error('Leave error data:', errorData);
        toast({
          title: 'Error',
          description: `Failed to leave: ${errorData.error || errorData.message || 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to leave community (catch):', error);
      toast({
        title: 'Error',
        description: 'Failed to leave community',
        variant: 'destructive',
      });
    }
  };

  // Combined loading check
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Community not found</p>
        <Link href="/dashboard/communities">
          <Button className="mt-4">Back to Communities</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{community.name}</h1>
          <p className="text-slate-600 mt-2">{community.description}</p>
        </div>
        <Button
          onClick={isJoined ? handleLeave : handleJoin}
          variant={isJoined ? 'outline' : 'default'}
          disabled={joining}
        >
          {joining ? 'Joining...' : isJoined ? 'Leave Community' : 'Join Community'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users size={24} className="mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{community.member_count}</p>
            <p className="text-sm text-slate-600 mt-1">Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare size={24} className="mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">Chat</p>
            <p className="text-sm text-slate-600 mt-1">Community Chat</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar size={24} className="mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">Events</p>
            <p className="text-sm text-slate-600 mt-1">Upcoming</p>
          </CardContent>
        </Card>
      </div>

      {isJoined ? (
        <Tabs defaultValue="chatroom" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chatroom">Chatroom</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="chatroom">
            <Chatroom communityId={communityId} />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="space-y-2">
              {members.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-slate-600">
                    No members yet
                  </CardContent>
                </Card>
              ) : (
                members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {member.user.full_name}
                          </h4>
                          <p className="text-sm text-slate-600">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="capitalize text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {member.role}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 mb-4">
              Join this community to access the chatroom and interact with members
            </p>
            <Button onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining...' : 'Join Now'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
