'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';

type SettingsPrefs = {
  notifications: {
    events: boolean;
    resources: boolean;
    community: boolean;
    email: boolean;
  };
  profileVisibility: 'public' | 'private' | 'friends';
  theme: 'light' | 'dark' | 'system';
};

const STORAGE_KEY = 'campus.settings.prefs.v1';

export default function SettingsPage() {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState({
    events: true,
    resources: true,
    community: true,
    email: true,
  });
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private' | 'friends'>(
    'public'
  );

  const currentPrefs: SettingsPrefs = useMemo(
    () => ({
      notifications,
      profileVisibility,
      theme: (theme as SettingsPrefs['theme']) || 'system',
    }),
    [notifications, profileVisibility, theme]
  );

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email }),
      });

      if (response.ok) {
        alert('Profile updated successfully!');
        router.refresh(); // Soft refresh to update server components with new data
      } else {
        const data = await response.json();
        alert(`Failed to update profile: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };



  // Sync editable profile fields from loaded profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SettingsPrefs>;

      if (parsed.notifications) {
        setNotifications((prev) => ({ ...prev, ...parsed.notifications }));
      }
      if (parsed.profileVisibility) {
        setProfileVisibility(parsed.profileVisibility);
      }
      if (parsed.theme) {
        setTheme(parsed.theme);
      }
    } catch {
      // ignore corrupted storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPrefs));
    } catch {
      // ignore storage errors
    }
  }, [currentPrefs]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={profile?.role ?? 'user'}
                readOnly
                disabled
                className="capitalize"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/users/sync-role', {
                      method: 'POST',
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert(`Role synced! Your role is now: ${data.user.role}`);
                      window.location.reload();
                    } else {
                      alert(`Failed to sync role: ${data.error}`);
                    }
                  } catch (error) {
                    alert('Failed to sync role. Please try again.');
                  }
                }}
              >
                Sync Role
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Your role is assigned by the system. Click "Sync Role" if your role doesn't match what you selected during signup.
            </p>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Theme</label>
            <Select
              value={(theme as 'light' | 'dark' | 'system') || 'system'}
              onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-slate-500">
            Theme is saved locally for this browser.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-900">Event Notifications</label>
              <p className="text-sm text-slate-600 mt-1">Get notified about new events</p>
            </div>
            <Switch
              checked={notifications.events}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, events: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-900">Resource Notifications</label>
              <p className="text-sm text-slate-600 mt-1">Get notified about resource availability</p>
            </div>
            <Switch
              checked={notifications.resources}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, resources: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-900">Community Updates</label>
              <p className="text-sm text-slate-600 mt-1">Get notified about community activities</p>
            </div>
            <Switch
              checked={notifications.community}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, community: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-900">Email Digest</label>
              <p className="text-sm text-slate-600 mt-1">Receive weekly email summary</p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, email: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Profile Visibility</label>
            <Select value={profileVisibility} onValueChange={(v) => setProfileVisibility(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline">Change Password</Button>
          <Button variant="destructive">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
