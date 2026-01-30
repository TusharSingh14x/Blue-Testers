export type UserRole = 'user' | 'organizer' | 'admin';

export const ROLES = {
  USER: 'user' as const,
  ORGANIZER: 'organizer' as const,
  ADMIN: 'admin' as const,
} as const;

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole | null | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    organizer: 2,
    admin: 3,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can create/manage communities and events
 */
export function canManageContent(userRole: UserRole | null | undefined): boolean {
  return hasRole(userRole, ROLES.ORGANIZER);
}

/**
 * Check if user can approve resources (admin only)
 */
export function canApproveResources(userRole: UserRole | null | undefined): boolean {
  return userRole === ROLES.ADMIN;
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(userRole: UserRole | null | undefined): boolean {
  return hasRole(userRole, ROLES.USER);
}

/**
 * Check if user can join rooms/communities
 */
export function canJoinRooms(userRole: UserRole | null | undefined): boolean {
  return hasRole(userRole, ROLES.USER);
}

