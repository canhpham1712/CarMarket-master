/**
 * Utility functions for checking user roles
 * Supports both legacy role system and RBAC system
 */

/**
 * Check if user has admin role (either legacy or RBAC)
 */
export function isAdmin(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  if (!user) return false;

  // Check RBAC roles first (preferred)
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.includes('admin') || user.roles.includes('super_admin');
  }

  // Fallback to legacy role
  return user.role === 'admin';
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(user: { roles?: string[] } | null | undefined, roleNames: string[]): boolean {
  if (!user || !user.roles || !Array.isArray(user.roles)) return false;
  return roleNames.some(roleName => user.roles!.includes(roleName));
}

/**
 * Get user's primary role (highest priority role)
 */
export function getPrimaryRole(user: { role?: string; roles?: string[] } | null | undefined): string | null {
  if (!user) return null;

  // Priority order for RBAC roles
  const rolePriority: Record<string, number> = {
    'super_admin': 100,
    'admin': 80,
    'moderator': 60,
    'seller': 40,
    'buyer': 20,
  };

  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    // Return highest priority role
    const sortedRoles = user.roles.sort((a, b) => {
      const priorityA = rolePriority[a] || 0;
      const priorityB = rolePriority[b] || 0;
      return priorityB - priorityA;
    });
    return sortedRoles[0];
  }

  // Fallback to legacy role
  return user.role || null;
}

