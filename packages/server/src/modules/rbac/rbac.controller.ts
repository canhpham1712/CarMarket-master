import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RbacController {
  constructor(
    private permissionService: PermissionService,
    private auditService: AuditService,
    @Optional()
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway?: ChatGateway,
    @Optional()
    @Inject(NotificationsService)
    private notificationsService?: NotificationsService,
  ) {}

  // Permission management
  @Get('permissions')
  async getPermissions() {
    try {
      return await this.permissionService.getAllPermissions();
    } catch (error) {
      // If RBAC data doesn't exist, return empty array
      console.log('RBAC data not found, returning empty permissions');
      return [];
    }
  }

  @Get('permissions/user/:userId')
  async getUserPermissions(@Param('userId') userId: string) {
    return this.permissionService.getUserPermissions(userId);
  }

  @Get('roles')
  async getRoles() {
    try {
      return await this.permissionService.getAllRoles();
    } catch (error) {
      // If RBAC data doesn't exist, return empty array
      console.log('RBAC data not found, returning empty roles');
      return [];
    }
  }

  @Get('roles/user/:userId')
  async getUserRoles(@Param('userId') userId: string) {
    return this.permissionService.getUserRoles(userId);
  }

  @Post('roles/assign')
  async assignRole(
    @Body() body: { userId: string; roleId: string; expiresAt?: string },
    @Request() req: any,
  ) {
    const userRole = await this.permissionService.assignRole(
      body.userId,
      body.roleId,
      req.user.id,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );

    // Log the role assignment
    await this.auditService.logPermissionChange(
      req.user.id,
      'ROLE_ASSIGNED',
      body.userId,
      { roleId: body.roleId, expiresAt: body.expiresAt },
      req.ip,
      req.headers['user-agent'],
    );

    // Create notification for the user about the new role assignment
    try {
      if (!this.notificationsService) {
        console.warn('[RbacController] NotificationsService not available, skipping notification');
      } else {
        // Get role name for notification
        const allRoles = await this.permissionService.getAllRoles();
        const assignedRole = allRoles.find((r: any) => r.id === body.roleId);
        const roleName = assignedRole?.name || 'new role';

        console.log(`[RbacController] Creating notification for user ${body.userId} about role "${roleName}"`);

        const notification = await this.notificationsService.createNotification(
          body.userId,
          NotificationType.ROLE_ASSIGNED,
          'New Role Assigned',
          `You have been assigned the "${roleName}" role. Please log out and log back in to receive this permission.`,
          null,
          {
            roleId: body.roleId,
            roleName: roleName,
            assignedBy: req.user.id,
            expiresAt: body.expiresAt || null,
          },
        );

        if (notification) {
          console.log(`[RbacController] ✅ Notification created successfully: ${notification.id}`);
        } else {
          console.warn(`[RbacController] ⚠️ Notification creation returned null (may be disabled by user preferences)`);
        }
      }
    } catch (notificationError: any) {
      // Log error but don't fail the request - role was already assigned
      console.error('[RbacController] ❌ Error creating role assignment notification:', {
        error: notificationError?.message || notificationError,
        stack: notificationError?.stack,
        userId: body.userId,
        roleId: body.roleId,
      });
    }

    return userRole;
  }

  @Delete('roles/remove')
  async removeRole(
    @Body() body: { userId: string; roleId: string },
    @Request() req: any,
  ) {
    // Get current user's roles
    const currentUserRoles = await this.permissionService.getUserRoles(req.user.id);
    const currentUserRoleNames = currentUserRoles.map((r: any) => r.name);
    
    // Get target user's roles
    const targetUserRoles = await this.permissionService.getUserRoles(body.userId);
    const targetUserRoleNames = targetUserRoles.map((r: any) => r.name);
    
    // Get the role being removed
    const allRoles = await this.permissionService.getAllRoles();
    const roleToRemove = allRoles.find((r: any) => r.id === body.roleId);
    const roleToRemoveName = roleToRemove?.name || '';

    // Define role hierarchy
    const roleHierarchy: Record<string, number> = {
      'buyer': 1,
      'seller': 2,
      'moderator': 3,
      'admin': 4,
      'super_admin': 5,
    };

    // Get current user's highest priority
    let currentUserMaxPriority = 0;
    currentUserRoleNames.forEach((role: string) => {
      const priority = roleHierarchy[role] || 0;
      if (priority > currentUserMaxPriority) {
        currentUserMaxPriority = priority;
      }
    });

    const isSuperAdmin = currentUserRoleNames.includes('super_admin');
    const isAdmin = currentUserRoleNames.includes('admin');
    const isModerator = currentUserRoleNames.includes('moderator') && !isAdmin && !isSuperAdmin;

    // Moderators cannot revoke any roles
    if (isModerator) {
      throw new ForbiddenException('Moderators do not have permission to revoke roles');
    }

    // Super admin restrictions
    if (isSuperAdmin) {
      // Cannot revoke super_admin from another super_admin
      if (roleToRemoveName === 'super_admin' && targetUserRoleNames.includes('super_admin')) {
        throw new ForbiddenException('Cannot revoke super_admin role from another super admin');
      }
    }

    // Admin restrictions
    if (isAdmin && !isSuperAdmin) {
      const targetRolePriority = roleHierarchy[roleToRemoveName] || 0;
      const adminPriority = roleHierarchy['admin'] || 4;
      // Admin cannot revoke admin or super_admin roles
      if (targetRolePriority >= adminPriority) {
        throw new ForbiddenException('Admins can only revoke roles from sellers, buyers, and moderators');
      }
    }

    // Perform the role removal
    await this.permissionService.removeRole(body.userId, body.roleId);

    // Log the role removal with detailed information
    await this.auditService.logPermissionChange(
      req.user.id,
      'ROLE_REMOVED',
      body.userId,
      { 
        roleId: body.roleId,
        roleName: roleToRemoveName,
        revokedBy: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
        revokedByRole: currentUserRoleNames.join(', '),
        targetUserRoles: targetUserRoleNames.join(', '),
      },
      req.ip,
      req.headers['user-agent'],
    );

    // Force logout the user so they get a new token without the revoked role
    let userLoggedOut = false;
    try {
      if (this.chatGateway && typeof this.chatGateway.forceLogoutUser === 'function') {
        const logoutReason = `Your "${roleToRemoveName}" role has been revoked. Please login again.`;
        
        // Call immediately (don't use setImmediate as we want to ensure it's called)
        const result = this.chatGateway.forceLogoutUser(body.userId, logoutReason);
        
        if (result) {
          userLoggedOut = true;
          console.log(`[RbacController] ✅ Force logout initiated for user ${body.userId} after revoking role "${roleToRemoveName}"`);
        } else {
          console.warn(`[RbacController] ⚠️ Force logout failed for user ${body.userId}. User may still have access until they logout manually.`);
        }
      } else {
        console.warn('[RbacController] ⚠️ ChatGateway not available. User will need to logout manually to lose revoked role.');
      }
    } catch (error: any) {
      // Log error but don't fail the request - role was already removed
      console.error('[RbacController] ❌ Failed to force logout user after role revocation:', error?.message || error);
    }

    return { 
      message: `Role "${roleToRemoveName}" removed successfully`,
      revokedRole: roleToRemoveName,
      targetUserId: body.userId,
      userLoggedOut,
    };
  }

  @Get('check-permission')
  async checkPermission(
    @Query('permission') permission: string,
    @Request() req: any,
  ) {
    const hasPermission = await this.permissionService.hasPermission(
      req.user.id,
      permission,
    );
    return { hasPermission };
  }

  @Get('check-resource-access')
  async checkResourceAccess(
    @Query('resource') resource: string,
    @Query('resourceId') resourceId: string,
    @Request() req: any,
  ) {
    const hasAccess = await this.permissionService.checkResourceAccess(
      req.user.id,
      resource,
      resourceId,
    );
    return { hasAccess };
  }

  // Audit logs
  @Get('audit-logs')
  async getAuditLogs(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    try {
      return await this.auditService.getAllAuditLogs(limit, offset);
    } catch (error) {
      // If audit logs don't exist, return empty array
      console.log('Audit logs not found, returning empty array');
      return [];
    }
  }

  @Get('audit-logs/user/:userId')
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.auditService.getUserAuditLogs(userId, limit, offset);
  }

  @Get('audit-logs/resource/:resource/:resourceId')
  async getResourceAuditLogs(
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.auditService.getResourceAuditLogs(resource, resourceId, limit, offset);
  }

  @Post('seed')
  async seedRbacData() {
    try {
      // Check if RBAC data already exists
      const existingRoles = await this.permissionService.getAllRoles();
      if (existingRoles.length > 0) {
        return { message: 'RBAC data already exists', success: true };
      }

      // For now, just return success - the actual seeding will be handled by the admin service
      return { message: 'RBAC seeding endpoint ready', success: true };
    } catch (error) {
      console.error('Failed to seed RBAC data:', error);
      return { message: 'Failed to seed RBAC data', success: false, error: error.message };
    }
  }
}
