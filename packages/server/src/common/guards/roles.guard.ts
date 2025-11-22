import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LegacyUserRole } from '../../entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PermissionService } from '../../modules/rbac/permission.service';

/**
 * Maps legacy role names to RBAC role names for backward compatibility
 */
const LEGACY_TO_RBAC_ROLE_MAP: Record<LegacyUserRole, string> = {
  [LegacyUserRole.ADMIN]: 'admin',
  [LegacyUserRole.USER]: 'buyer', // Regular users get 'buyer' role by default
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<LegacyUserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get user's RBAC roles
    const userRoles = await this.permissionService.getUserRoles(user.id);
    const userRoleNames = userRoles.map(r => r.name);

    // Check if user has any of the required roles
    // Map legacy roles to RBAC roles for backward compatibility
    const requiredRBACRoles = requiredRoles.map(legacyRole => 
      LEGACY_TO_RBAC_ROLE_MAP[legacyRole]
    );

    // Also check for super_admin which has all permissions
    if (userRoleNames.includes('super_admin')) {
      return true;
    }

    // Check if user has any of the required RBAC roles
    return requiredRBACRoles.some(roleName => userRoleNames.includes(roleName));
  }
}
