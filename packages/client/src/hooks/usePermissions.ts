import { useMemo } from 'react';
import { useAuthStore } from '../store/auth';

/**
 * Hook to check user permissions
 * Returns helper functions to check if user has specific permissions
 */
export function usePermissions() {
  const { permissions, user } = useAuthStore();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!permissions || permissions.length === 0) return false;
      return permissions.includes(permission);
    };
  }, [permissions]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!permissions || permissions.length === 0) return false;
      return permissionList.some(perm => permissions.includes(perm));
    };
  }, [permissions]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!permissions || permissions.length === 0) return false;
      return permissionList.every(perm => permissions.includes(perm));
    };
  }, [permissions]);

  /**
   * Check if user has a specific role
   */
  const hasRole = useMemo(() => {
    return (roleName: string): boolean => {
      if (user?.roles && Array.isArray(user.roles)) {
        return user.roles.includes(roleName);
      }
      // Fallback to legacy role check
      return user?.role === roleName;
    };
  }, [user]);

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useMemo(() => {
    return (roleList: string[]): boolean => {
      if (user?.roles && Array.isArray(user.roles)) {
        return roleList.some(role => user.roles!.includes(role));
      }
      // Fallback to legacy role check
      return roleList.includes(user?.role || '');
    };
  }, [user]);

  /**
   * Check if user is admin (has admin or super_admin role)
   */
  const isAdmin = useMemo(() => {
    return (): boolean => {
      if (user?.roles && Array.isArray(user.roles)) {
        return user.roles.includes('admin') || user.roles.includes('super_admin');
      }
      // Fallback to legacy role check
      return user?.role === 'admin';
    };
  }, [user]);

  /**
   * Get all user permissions
   */
  const userPermissions = useMemo(() => {
    return permissions || [];
  }, [permissions]);

  /**
   * Get all user roles
   */
  const userRoles = useMemo(() => {
    if (user?.roles && Array.isArray(user.roles)) {
      return user.roles;
    }
    // Fallback to legacy role
    return user?.role ? [user.role] : [];
  }, [user]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    userPermissions,
    userRoles,
  };
}

