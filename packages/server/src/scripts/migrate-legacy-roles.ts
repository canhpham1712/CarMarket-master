import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';

/**
 * Migration script to migrate all users from legacy role to RBAC roles
 * This ensures every user has at least one RBAC role assigned
 */
export async function migrateLegacyRolesToRBAC(dataSource: DataSource): Promise<void> {
  console.log('🚀 Starting migration from legacy roles to RBAC...');

  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);
  const userRoleRepository = dataSource.getRepository(UserRole);

  // Get all roles
  const roles = await roleRepository.find();
  const roleMap = new Map(roles.map(r => [r.name, r]));

  // Get all users
  const users = await userRepository.find();
  console.log(`📊 Found ${users.length} users to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      // Check if user already has RBAC roles assigned
      const existingRoles = await userRoleRepository.find({
        where: { userId: user.id, isActive: true },
      });

      if (existingRoles.length > 0) {
        console.log(`⏭️  User ${user.email} already has ${existingRoles.length} RBAC role(s), skipping...`);
        skippedCount++;
        continue;
      }

      // Determine RBAC role based on legacy role
      let roleName: string;
      if (user.role === 'admin') {
        roleName = 'admin';
      } else {
        // Default to 'buyer' for regular users
        roleName = 'buyer';
      }

      const role = roleMap.get(roleName);
      if (!role) {
        console.error(`❌ Role '${roleName}' not found in database for user ${user.email}`);
        errorCount++;
        continue;
      }

      // Check if user_role already exists (inactive)
      let userRole = await userRoleRepository.findOne({
        where: { userId: user.id, roleId: role.id },
      });

      if (userRole) {
        // Reactivate existing role
        userRole.isActive = true;
        userRole.expiresAt = null;
        await userRoleRepository.save(userRole);
        console.log(`✅ Reactivated role '${roleName}' for user ${user.email}`);
      } else {
        // Create new user_role assignment
        userRole = userRoleRepository.create({
          userId: user.id,
          roleId: role.id,
          isActive: true,
          expiresAt: null,
        });
        await userRoleRepository.save(userRole);
        console.log(`✅ Assigned role '${roleName}' to user ${user.email}`);
      }

      migratedCount++;
    } catch (error) {
      console.error(`❌ Error migrating user ${user.email}:`, error);
      errorCount++;
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`   ✅ Migrated: ${migratedCount} users`);
  console.log(`   ⏭️  Skipped: ${skippedCount} users (already have RBAC roles)`);
  console.log(`   ❌ Errors: ${errorCount} users`);
  console.log('\n✨ Migration completed!');
}

