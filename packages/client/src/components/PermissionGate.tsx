import { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string | string[];
  requireAnyPermission?: string[];
  requireAllPermissions?: string[];
  requireRole?: string | string[];
  requireAnyRole?: string[];
  fallback?: ReactNode;
  showError?: boolean;
}

/**
 * PermissionGate component - conditionally renders children based on permissions
 * Use this to hide/show UI elements based on user permissions
 * 
 * @example
 * // Show button only if user has permission
 * <PermissionGate permission="admin:dashboard">
 *   <Button>Admin Dashboard</Button>
 * </PermissionGate>
 * 
 * @example
 * // Show with custom fallback
 * <PermissionGate 
 *   permission="listing:delete"
 *   fallback={<span className="text-gray-400">No permission</span>}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  fallback = null,
  showError = false,
}: PermissionGateProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  } = usePermissions();

  let hasAccess = true;

  // Check single permission
  if (permission) {
    const permissionList = Array.isArray(permission) ? permission : [permission];
    hasAccess = hasAccess && hasAnyPermission(permissionList);
  }

  // Check any permission
  if (requireAnyPermission && requireAnyPermission.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(requireAnyPermission);
  }

  // Check all permissions
  if (requireAllPermissions && requireAllPermissions.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(requireAllPermissions);
  }

  // Check single role
  if (requireRole) {
    const roleList = Array.isArray(requireRole) ? requireRole : [requireRole];
    hasAccess = hasAccess && hasAnyRole(roleList);
  }

  // Check any role
  if (requireAnyRole && requireAnyRole.length > 0) {
    hasAccess = hasAccess && hasAnyRole(requireAnyRole);
  }

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="text-red-500 text-sm">
          Insufficient permissions
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

