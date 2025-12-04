import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { usePermissions } from "../hooks/usePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePermission?: string | string[];
  requireAnyPermission?: string[];
  requireAllPermissions?: string[];
  requireRole?: string | string[];
  requireAnyRole?: string[];
  fallbackPath?: string;
}

/**
 * ProtectedRoute component that checks permissions before rendering children
 * 
 * @example
 * // Require single permission
 * <ProtectedRoute requirePermission="admin:dashboard">
 *   <AdminDashboard />
 * </ProtectedRoute>
 * 
 * @example
 * // Require any of multiple permissions
 * <ProtectedRoute requireAnyPermission={["admin:dashboard", "admin:users"]}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * @example
 * // Require role
 * <ProtectedRoute requireRole="admin">
 *   <AdminPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  fallbackPath = "/",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
  } = usePermissions();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check single permission
  if (requirePermission) {
    const permissionList = Array.isArray(requirePermission)
      ? requirePermission
      : [requirePermission];
    if (!hasAnyPermission(permissionList)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check any permission
  if (requireAnyPermission && requireAnyPermission.length > 0) {
    if (!hasAnyPermission(requireAnyPermission)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check all permissions
  if (requireAllPermissions && requireAllPermissions.length > 0) {
    if (!hasAllPermissions(requireAllPermissions)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check single role
  if (requireRole) {
    const roleList = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!hasAnyRole(roleList)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check any role
  if (requireAnyRole && requireAnyRole.length > 0) {
    if (!hasAnyRole(requireAnyRole)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
}
