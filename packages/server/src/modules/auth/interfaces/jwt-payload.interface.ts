import { LegacyUserRole } from '../../../entities/user.entity';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role?: LegacyUserRole; // Deprecated: kept for backward compatibility during migration
  roles?: string[]; // RBAC role names (e.g., ['admin', 'seller'])
  permissions?: string[]; // RBAC permissions (e.g., ['admin:dashboard', 'user:read'])
  iat?: number; // Issued at
  exp?: number; // Expires at
}
