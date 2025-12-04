import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PermissionService } from '../../modules/rbac/permission.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
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

    // Also check for super_admin which has all permissions
    if (userRoleNames.includes('super_admin')) {
      return true;
    }

    // Check if user has any of the required RBAC roles
    return requiredRoles.some(roleName => userRoleNames.includes(roleName));
  }
}
