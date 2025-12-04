import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @RequirePermission('admin:dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @RequirePermission('admin:users')
  getAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.adminService.getAllUsers(page, limit);
  }

  @Get('listings/pending')
  @RequirePermission('admin:listings')
  getPendingListings(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.adminService.getPendingListings(page, limit);
  }

  @Put('listings/:id/approve')
  @RequirePermission('listing:manage')
  approveListing(@Param('id') id: string, @CurrentUser() user: User) {
    return this.adminService.approveListing(id, user.id);
  }

  @Put('listings/:id/reject')
  @RequirePermission('listing:manage')
  rejectListing(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectListing(id, reason, user.id);
  }

  @Get('listings/:id/pending-changes')
  @RequirePermission('admin:listings')
  getListingWithPendingChanges(@Param('id') id: string) {
    return this.adminService.getListingWithPendingChanges(id);
  }

  @Get('transactions')
  @RequirePermission('transaction:read')
  getTransactions(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.adminService.getTransactions(page, limit);
  }

  // Enhanced listing management
  @Get('listings')
  @RequirePermission('admin:listings')
  getAllListings(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllListings(page, limit, status, search);
  }

  @Get('listings/:id')
  @RequirePermission('admin:listings')
  getListingById(@Param('id') id: string) {
    return this.adminService.getListingById(id);
  }

  @Put('listings/:id/status')
  @RequirePermission('listing:manage')
  updateListingStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateListingStatus(id, status, reason);
  }

  @Delete('listings/:id')
  @RequirePermission('listing:delete')
  deleteListing(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.adminService.deleteListing(id, body.reason);
  }

  @Put('listings/:id/featured')
  @RequirePermission('listing:manage')
  toggleFeatured(@Param('id') id: string) {
    return this.adminService.toggleFeatured(id);
  }

  // Enhanced user management
  @Get('users/:id')
  @RequirePermission('user:read')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id/status')
  @RequirePermission('user:manage')
  updateUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateUserStatus(id, isActive, reason);
  }

  @Put('users/:id/role')
  @RequirePermission('user:manage')
  updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Get('users/:id/listings')
  @RequirePermission('user:read')
  getUserListings(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.adminService.getUserListings(id, page, limit);
  }

  // RBAC endpoints for admin dashboard
  @Get('rbac/roles')
  @RequirePermission('system:manage')
  getAllRoles() {
    return this.adminService.getAllRoles();
  }

  @Get('rbac/roles/user/:userId')
  @RequirePermission('user:read')
  getUserRoles(@Param('userId') userId: string) {
    return this.adminService.getUserRoles(userId);
  }

  @Post('rbac/roles/assign')
  @RequirePermission('user:manage')
  assignRole(
    @Body() body: { userId: string; roleId: string; expiresAt?: string },
    @Request() req: any,
  ) {
    return this.adminService.assignRole(
      body.userId,
      body.roleId,
      req.user.id,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  @Delete('rbac/roles/remove')
  @RequirePermission('user:manage')
  removeRole(@Body() body: { userId: string; roleId: string }) {
    return this.adminService.removeRole(body.userId, body.roleId);
  }

  @Get('rbac/permissions')
  @RequirePermission('system:manage')
  getAllPermissions() {
    return this.adminService.getAllPermissions();
  }

  @Get('rbac/audit-logs')
  @RequirePermission('system:logs')
  getAuditLogs(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.adminService.getAuditLogs(limit);
  }

  // Analytics and reports
  @Get('analytics/overview')
  @RequirePermission('admin:dashboard')
  getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @Get('analytics/listings')
  @RequirePermission('admin:dashboard')
  getListingAnalytics(@Query('period') period: string = '30d') {
    return this.adminService.getListingAnalytics(period);
  }

  @Get('analytics/users')
  @RequirePermission('admin:dashboard')
  getUserAnalytics(@Query('period') period: string = '30d') {
    return this.adminService.getUserAnalytics(period);
  }

  @Post('rbac/seed')
  @RequirePermission('system:manage')
  seedRbacData() {
    return this.adminService.seedRbacData();
  }
}
