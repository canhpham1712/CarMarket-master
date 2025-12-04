import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { PermissionService } from '../../modules/rbac/permission.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RoleValidationInterceptor implements NestInterceptor {
  constructor(
    private permissionService: PermissionService,
    private jwtService: JwtService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip if no user (public endpoints)
    if (!user || !user.id) {
      return next.handle();
    }

    // Skip for auth endpoints to avoid loops
    const url = request.url;
    if (url.includes('/auth/') && (url.includes('/login') || url.includes('/register'))) {
      return next.handle();
    }

    try {
      // Get roles from database (current state)
      const dbRoles = await this.permissionService.getUserRoles(user.id);
      const dbRoleNames = dbRoles.map((r: any) => r.name).sort();

      // Get roles from JWT token
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const payload = this.jwtService.decode(token) as any;
        const jwtRoleNames = (payload?.roles || []).sort();

        // Compare roles
        const rolesMatch =
          dbRoleNames.length === jwtRoleNames.length &&
          dbRoleNames.every((role, index) => role === jwtRoleNames[index]);

        if (!rolesMatch) {
          // Roles don't match - token is stale
          throw new UnauthorizedException({
            code: 'STALE_TOKEN',
            message: 'Your session has expired. Please login again.',
            rolesChanged: true,
          });
        }
      }
    } catch (error: any) {
      // If it's our custom stale token error, throw it
      if (error instanceof UnauthorizedException) {
        const response = error.getResponse();
        if (typeof response === 'object' && response !== null && 'code' in response && response.code === 'STALE_TOKEN') {
          return throwError(() => error);
        }
      }
      // For other errors, just log and continue (don't block the request)
      console.error('[RoleValidationInterceptor] Error validating roles:', error?.message);
    }

    return next.handle();
  }
}
