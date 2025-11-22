import { ProtectedRoute } from "./ProtectedRoute";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute component - requires admin or super_admin role
 * Uses ProtectedRoute with permission checks for better security
 */
export function AdminRoute({ children }: AdminRouteProps) {
  return (
    <ProtectedRoute
      requireAnyRole={["admin", "super_admin"]}
      requireAnyPermission={["admin:dashboard"]}
      fallbackPath="/"
    >
      {children}
    </ProtectedRoute>
  );
}
