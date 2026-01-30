'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Calendar, BookOpen, MessageSquare, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const pageNames: Record<string, string> = {
  '/dashboard/events': 'Events',
  '/dashboard/resources': 'Resources',
  '/dashboard/communities': 'Communities',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
  '/dashboard': 'Dashboard',
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  time: string;
  unread: boolean;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const pageTitle = pageNames[pathname] || 'Dashboard';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar size={16} className="text-blue-600" />;
      case 'booking':
        return <BookOpen size={16} className="text-green-600" />;
      case 'message':
        return <MessageSquare size={16} className="text-purple-600" />;
      case 'approval':
        return <ShieldCheck size={16} className="text-orange-600" />;
      default:
        return <Bell size={16} />;
    }
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{pageTitle}</h2>
        <p className="text-sm text-slate-600 capitalize">{profile?.role}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 flex-1 max-w-xs">
          <Search size={18} className="text-slate-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="bg-transparent border-0 outline-none text-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-600 mt-1">{unreadCount} unread</p>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-600 text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">
                  <Bell size={24} className="mx-auto mb-2 text-slate-400" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.link}
                      onClick={() => {
                        // Mark as read when clicked
                        setNotifications(prev =>
                          prev.map(n =>
                            n.id === notification.id ? { ...n, unread: false } : n
                          )
                        );
                        setUnreadCount(prev => Math.max(0, prev - 1));
                      }}
                      className={cn(
                        'block px-4 py-3 hover:bg-slate-50 transition-colors',
                        notification.unread && 'bg-blue-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {notification.title}
                            </p>
                            {notification.unread && (
                              <span className="h-2 w-2 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatTime(notification.time)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => router.push('/dashboard')}
                >
                  View All
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
