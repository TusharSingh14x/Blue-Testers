'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, MapPin, Award, Users } from 'lucide-react';

const mockUserStats = {
  eventsAttended: 24,
  resourcesBooked: 15,
  communitiesJoined: 8,
  badges: ['Active Member', 'Event Organizer', 'Community Leader'],
};

export default function ProfilePage({ params }: { params: { id: string } }) {
  const { profile } = useAuth();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{profile?.full_name}</h1>
          <p className="text-slate-600 mt-2 capitalize">{profile?.role} • {profile?.community}</p>
        </div>
        <Button>Edit Profile</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{mockUserStats.eventsAttended}</p>
            <p className="text-sm text-slate-600 mt-2">Events Attended</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{mockUserStats.resourcesBooked}</p>
            <p className="text-sm text-slate-600 mt-2">Resources Booked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{mockUserStats.communitiesJoined}</p>
            <p className="text-sm text-slate-600 mt-2">Communities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-orange-600">{mockUserStats.badges.length}</p>
            <p className="text-sm text-slate-600 mt-2">Badges</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail size={20} />
            <span>{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin size={20} />
            <span className="capitalize">{profile?.community} Division</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mockUserStats.badges.map((badge) => (
              <Badge key={badge} variant="secondary" className="gap-1">
                <Award size={14} />
                {badge}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Engineering Club', 'AI & ML Society', 'Tech Startup Hub'].map((community) => (
              <div key={community} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-slate-600" />
                  <span className="font-medium text-slate-900">{community}</span>
                </div>
                <Badge variant="outline">Member</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
