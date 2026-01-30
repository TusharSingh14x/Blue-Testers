'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Users,
  BookOpen,
  BarChart3,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  {
    label: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
    roles: ['user', 'organizer', 'admin'] // All can view
  },
  {
    label: 'Resources',
    href: '/dashboard/resources',
    icon: BookOpen,
    roles: ['user', 'organizer', 'admin'] // All can view
  },
  {
    label: 'Communities',
    href: '/dashboard/communities',
    icon: Users,
    roles: ['user', 'organizer', 'admin'] // All can join/view
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    roles: ['user', 'organizer', 'admin'] // All can view
  },
  {
    label: 'Resource Approvals',
    href: '/dashboard/resources/approvals',
    icon: ShieldCheck,
    roles: ['admin'] // Admin only
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['user', 'organizer', 'admin'] // All can access
  },
];

export function Sidebar() {
  const { logout, profile } = useAuth();
  const { role } = useRole();
  const pathname = usePathname();

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(role || 'user')
  );

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <Link href="/dashboard" className="p-6 border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
        <h1 className="text-2xl font-bold text-blue-600">Campus Hub</h1>
        <p className="text-xs text-slate-600 mt-1">Resource Management</p>
      </Link>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4 space-y-2">
        <div className="px-4 py-2">
          <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
          <p className="text-xs text-slate-600 capitalize">{profile?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
