'use client';

import { useAuth } from './use-auth';
import type { UserRole } from '@/lib/roles';
import { hasRole, canManageContent, canApproveResources, canViewAnalytics, canJoinRooms } from '@/lib/roles';

export function useRole() {
  const { profile, loading } = useAuth();
  const userRole = (profile?.role as UserRole) || null;

  return {
    role: userRole,
    loading,
    // Role checks
    isUser: userRole === 'user',
    isOrganizer: userRole === 'organizer' || userRole === 'admin',
    isAdmin: userRole === 'admin',
    // Permission checks
    canManageContent: canManageContent(userRole),
    canApproveResources: canApproveResources(userRole),
    canViewAnalytics: canViewAnalytics(userRole),
    canJoinRooms: canJoinRooms(userRole),
    hasRole: (requiredRole: UserRole) => hasRole(userRole, requiredRole),
  };
}

