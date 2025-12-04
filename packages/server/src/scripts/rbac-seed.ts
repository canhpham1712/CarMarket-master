import { DataSource } from 'typeorm';
import { Permission, PermissionAction, PermissionResource } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { User } from '../entities/user.entity';

export class RbacSeed {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    console.log('Starting RBAC seed...');

    // Create permissions
    const permissions = await this.createPermissions();
    console.log(`Created ${permissions.length} permissions`);

    // Create roles
    const roles = await this.createRoles(permissions);
    console.log(`Created ${roles.length} roles`);

    // Migrate existing users
    await this.migrateExistingUsers(roles);
    console.log('Migrated existing users to new RBAC system');

    console.log('RBAC seed completed successfully');
  }

  private async createPermissions(): Promise<Permission[]> {
    const permissionRepository = this.dataSource.getRepository(Permission);

    const permissionData = [
      // User permissions
      { name: 'user:create', description: 'Create new users', action: PermissionAction.CREATE, resource: PermissionResource.USER },
      { name: 'user:read', description: 'View user information', action: PermissionAction.READ, resource: PermissionResource.USER },
      { name: 'user:update', description: 'Update user information', action: PermissionAction.UPDATE, resource: PermissionResource.USER },
      { name: 'user:delete', description: 'Delete users', action: PermissionAction.DELETE, resource: PermissionResource.USER },
      { name: 'user:manage', description: 'Manage all users', action: PermissionAction.MANAGE, resource: PermissionResource.USER },

      // Listing permissions
      { name: 'listing:create', description: 'Create new listings', action: PermissionAction.CREATE, resource: PermissionResource.LISTING },
      { name: 'listing:read', description: 'View listings', action: PermissionAction.READ, resource: PermissionResource.LISTING },
      { name: 'listing:update', description: 'Update listings', action: PermissionAction.UPDATE, resource: PermissionResource.LISTING },
      { name: 'listing:delete', description: 'Delete listings', action: PermissionAction.DELETE, resource: PermissionResource.LISTING },
      { name: 'listing:manage', description: 'Manage all listings', action: PermissionAction.MANAGE, resource: PermissionResource.LISTING },

      // Transaction permissions
      { name: 'transaction:create', description: 'Create transactions', action: PermissionAction.CREATE, resource: PermissionResource.TRANSACTION },
      { name: 'transaction:read', description: 'View transactions', action: PermissionAction.READ, resource: PermissionResource.TRANSACTION },
      { name: 'transaction:update', description: 'Update transactions', action: PermissionAction.UPDATE, resource: PermissionResource.TRANSACTION },
      { name: 'transaction:manage', description: 'Manage all transactions', action: PermissionAction.MANAGE, resource: PermissionResource.TRANSACTION },

      // Admin permissions
      { name: 'admin:dashboard', description: 'Access admin dashboard', action: PermissionAction.READ, resource: PermissionResource.ADMIN },
      { name: 'admin:users', description: 'Manage users in admin', action: PermissionAction.MANAGE, resource: PermissionResource.ADMIN },
      { name: 'admin:listings', description: 'Manage listings in admin', action: PermissionAction.MANAGE, resource: PermissionResource.ADMIN },
      { name: 'admin:metadata', description: 'Manage metadata in admin', action: PermissionAction.READ, resource: PermissionResource.ADMIN },
      { name: 'admin:logs', description: 'View system logs', action: PermissionAction.READ, resource: PermissionResource.ADMIN },

      // Chat permissions
      { name: 'chat:send', description: 'Send chat messages', action: PermissionAction.CREATE, resource: PermissionResource.CHAT },
      { name: 'chat:read', description: 'Read chat messages', action: PermissionAction.READ, resource: PermissionResource.CHAT },
      { name: 'chat:moderate', description: 'Moderate chat', action: PermissionAction.MANAGE, resource: PermissionResource.CHAT },

      // Assistant permissions
      { name: 'assistant:use', description: 'Use virtual assistant', action: PermissionAction.READ, resource: PermissionResource.ASSISTANT },
      { name: 'assistant:configure', description: 'Configure assistant settings', action: PermissionAction.UPDATE, resource: PermissionResource.ASSISTANT },

      // System permissions
      { name: 'system:logs', description: 'View system logs', action: PermissionAction.READ, resource: PermissionResource.LOGS },
      { name: 'system:manage', description: 'Manage system settings', action: PermissionAction.MANAGE, resource: PermissionResource.SYSTEM },

      // Analytics permissions
      { name: 'analytics:view', description: 'View analytics', action: PermissionAction.READ, resource: PermissionResource.SYSTEM },
      { name: 'analytics:revenue', description: 'View revenue data', action: PermissionAction.READ, resource: PermissionResource.SYSTEM },
      { name: 'analytics:users', description: 'View user analytics', action: PermissionAction.READ, resource: PermissionResource.SYSTEM },
      { name: 'analytics:listings', description: 'View listing analytics', action: PermissionAction.READ, resource: PermissionResource.SYSTEM },

      // Dashboard permissions
      { name: 'dashboard:admin', description: 'Access admin dashboard', action: PermissionAction.READ, resource: PermissionResource.ADMIN },
      { name: 'dashboard:seller', description: 'Access seller dashboard', action: PermissionAction.READ, resource: PermissionResource.USER },

      // Monitoring permissions
      { name: 'monitoring:view', description: 'View system monitoring and real-time metrics', action: PermissionAction.READ, resource: PermissionResource.SYSTEM },
    ];

    const permissions: Permission[] = [];

    for (const data of permissionData) {
      let permission = await permissionRepository.findOne({ where: { name: data.name } });
      
      if (!permission) {
        permission = permissionRepository.create(data);
        permission = await permissionRepository.save(permission);
      }
      
      if (permission) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  private async createRoles(permissions: Permission[]): Promise<Role[]> {
    const roleRepository = this.dataSource.getRepository(Role);

    const roleData = [
      {
        name: 'super_admin',
        description: 'Super Administrator with all permissions',
        isSystem: true,
        priority: 100,
        permissions: permissions, // All permissions
      },
      {
        name: 'admin',
        description: 'Administrator with user and listing management',
        isSystem: true,
        priority: 80,
        permissions: permissions.filter(p => 
          p.name.startsWith('user:') || 
          p.name.startsWith('listing:') || 
          p.name.startsWith('admin:') ||
          p.name.startsWith('system:logs') ||
          p.name === 'system:manage' || // Add system:manage for metadata management
          p.name.startsWith('analytics:') ||
          p.name === 'dashboard:admin' ||
          p.name === 'monitoring:view'
        ),
      },
      {
        name: 'moderator',
        description: 'Content moderator',
        isSystem: true,
        priority: 60,
        permissions: permissions.filter(p => 
          p.name.startsWith('listing:read') ||
          p.name.startsWith('listing:update') ||
          p.name.startsWith('chat:') ||
          p.name.startsWith('user:read') ||
          p.name === 'analytics:view' ||
          p.name === 'analytics:listings'
        ),
      },
      {
        name: 'seller',
        description: 'Car seller with listing management',
        isSystem: true,
        priority: 40,
        permissions: permissions.filter(p => 
          p.name.startsWith('listing:') ||
          p.name.startsWith('transaction:') ||
          p.name.startsWith('chat:send') ||
          p.name.startsWith('chat:read') ||
          p.name.startsWith('assistant:use') ||
          p.name === 'analytics:view' ||
          p.name === 'analytics:revenue' ||
          p.name === 'analytics:listings' ||
          p.name === 'dashboard:seller'
        ),
      },
      {
        name: 'buyer',
        description: 'Car buyer with basic permissions',
        isSystem: true,
        priority: 20,
        permissions: permissions.filter(p => 
          p.name === 'listing:read' ||
          p.name === 'transaction:create' ||
          p.name === 'transaction:read' ||
          p.name.startsWith('chat:send') ||
          p.name.startsWith('chat:read') ||
          p.name.startsWith('assistant:use') ||
          p.name === 'user:read' ||
          p.name === 'user:update' ||
          p.name === 'analytics:view'
        ),
      },
    ];

    const roles: Role[] = [];

    for (const data of roleData) {
      let role = await roleRepository.findOne({ where: { name: data.name } });
      
      if (!role) {
        role = roleRepository.create({
          name: data.name,
          description: data.description,
          isSystem: data.isSystem,
          priority: data.priority,
        });
        await roleRepository.save(role);
      }

      // Assign permissions to role
      role.permissions = data.permissions;
      await roleRepository.save(role);
      
      roles.push(role);
    }

    return roles;
  }

  private async migrateExistingUsers(roles: Role[]): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);
    const userRoleRepository = this.dataSource.getRepository(UserRole);

    // Get all existing users
    const users = await userRepository.find();

    for (const user of users) {
      // Check if user already has roles assigned
      const existingRoles = await userRoleRepository.find({
        where: { userId: user.id, isActive: true },
      });

      if (existingRoles.length > 0) {
        continue; // User already has RBAC roles assigned
      }

      // Assign default 'buyer' role to users without roles
      // Admin roles should be assigned through RBAC management interface
      const roleName = 'buyer';
      const role = roles.find(r => r.name === roleName);
      if (!role) {
        console.warn(`Role ${roleName} not found for user ${user.id}`);
        continue;
      }

      // Assign role to user
      const userRole = userRoleRepository.create({
        userId: user.id,
        roleId: role.id,
        isActive: true,
      });

      await userRoleRepository.save(userRole);
      console.log(`Assigned role ${roleName} to user ${user.id}`);
    }
  }
}
