import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Permission } from '../../entities/permission.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Get all permissions for a user (from roles and direct permissions)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // Get roles that are either:
    // 1. Have no expiration date (expiresAt is null)
    // 2. Have expiration date in the future
    const userRoles = await this.userRoleRepository.find({
      where: [
        {
          userId,
          isActive: true,
          expiresAt: IsNull(),
        },
        {
          userId,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      ],
      relations: ['role', 'role.permissions'],
    });

    const permissions = new Map<string, Permission>();
    
    // Collect permissions from roles
    for (const userRole of userRoles) {
      if (userRole.role?.permissions) {
        for (const permission of userRole.role.permissions) {
          if (permission.isActive) {
            permissions.set(permission.id, permission);
          }
        }
      }
    }

    return Array.from(permissions.values());
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(permission => permission.name === permissionName);
  }

  /**
   * Check if user can access a specific resource
   */
  async checkResourceAccess(
    userId: string,
    resource: string,
    resourceId: string,
  ): Promise<boolean> {
    // Check if user has MANAGE permission for the resource
    const hasManagePermission = await this.hasPermission(
      userId,
      `${resource.toLowerCase()}:manage`,
    );

    if (hasManagePermission) {
      return true;
    }

    // Check if user owns the resource
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // For listings, check if user is the seller
    if (resource === 'LISTING') {
      const listing = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.listings', 'listing')
        .where('user.id = :userId', { userId })
        .andWhere('listing.id = :resourceId', { resourceId })
        .getOne();

      return !!listing;
    }

    // For users, check if it's the same user
    if (resource === 'USER') {
      return userId === resourceId;
    }

    return false;
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    // Get roles that are either:
    // 1. Have no expiration date (expiresAt is null)
    // 2. Have expiration date in the future
    const userRoles = await this.userRoleRepository.find({
      where: [
        {
          userId,
          isActive: true,
          expiresAt: IsNull(),
        },
        {
          userId,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      ],
      relations: ['role'],
    });

    return userRoles
      .map(userRole => userRole.role)
      .filter(role => role && role.isActive);
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date,
  ): Promise<UserRole> {
    // Check if role assignment already exists
    const existingAssignment = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (existingAssignment) {
      existingAssignment.isActive = true;
      existingAssignment.assignedBy = assignedBy;
      existingAssignment.expiresAt = expiresAt || null;
      return await this.userRoleRepository.save(existingAssignment);
    }

    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      assignedBy,
      isActive: true,
      expiresAt: expiresAt || null,
    });

    return await this.userRoleRepository.save(userRole);
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepository.update(
      { userId, roleId },
      { isActive: false },
    );
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasRole(userId: string, roleNames: string[]): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some(role => roleNames.includes(role.name));
  }

  /**
   * Get user's highest priority role
   */
  async getHighestPriorityRole(userId: string): Promise<Role | null> {
    const userRoles = await this.getUserRoles(userId);
    
    if (userRoles.length === 0) {
      return null;
    }

    return userRoles.reduce((highest, current) => 
      current.priority > highest.priority ? current : highest
    );
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { isActive: true },
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { isActive: true },
      relations: ['permissions'],
      order: { priority: 'DESC' },
    });
  }
}
