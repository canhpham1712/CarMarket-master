import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSuperAdminAndModerator1700000000003 implements MigrationInterface {
  name = 'SeedSuperAdminAndModerator1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ========================================
    // BƯỚC 0: ĐẢM BẢO ROLES TỒN TẠI (Fix lỗi Role not found)
    // ========================================
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, "isSystem", priority, "createdAt", "updatedAt")
      VALUES 
        (uuid_generate_v4(), 'super_admin', 'Super Administrator', true, 100, NOW(), NOW()),
        (uuid_generate_v4(), 'admin', 'Administrator', true, 80, NOW(), NOW()),
        (uuid_generate_v4(), 'moderator', 'Content Moderator', true, 60, NOW(), NOW()),
        (uuid_generate_v4(), 'seller', 'Seller', true, 40, NOW(), NOW()),
        (uuid_generate_v4(), 'buyer', 'Buyer', true, 20, NOW(), NOW()),
        (uuid_generate_v4(), 'user', 'Standard User', false, 1, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING;
    `);


    // ========================================
    // Step 1: Create or update Super Admin user
    // ========================================
    await queryRunner.query(`
      INSERT INTO users (
          id, email, password, "firstName", "lastName", "phoneNumber", 
          role, "isActive", "isEmailVerified", provider, "createdAt", "updatedAt"
      ) VALUES (
          COALESCE((SELECT id FROM users WHERE email = 'superadmin@carmarket.com'), uuid_generate_v4()),
          'superadmin@carmarket.com',
          '$2b$12$22XPfsAaoVFNixpvzkAow.DajxY5NPwHdHfY1qifgaT0C1lNDkXci', -- SuperAdmin123!
          'Super', 'Admin', '+1234567890',
          'admin', true, true, 'local',
          COALESCE((SELECT "createdAt" FROM users WHERE email = 'superadmin@carmarket.com'), CURRENT_TIMESTAMP),
          CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          "firstName" = EXCLUDED."firstName",
          "lastName" = EXCLUDED."lastName",
          "phoneNumber" = EXCLUDED."phoneNumber",
          role = EXCLUDED.role,
          "isActive" = EXCLUDED."isActive",
          "isEmailVerified" = EXCLUDED."isEmailVerified",
          "updatedAt" = CURRENT_TIMESTAMP;
    `);

    // ========================================
    // Step 2: Create or update Moderator user
    // ========================================
    await queryRunner.query(`
      INSERT INTO users (
          id, email, password, "firstName", "lastName", "phoneNumber", 
          role, "isActive", "isEmailVerified", provider, "createdAt", "updatedAt"
      ) VALUES (
          COALESCE((SELECT id FROM users WHERE email = 'moderator@carmarket.com'), uuid_generate_v4()),
          'moderator@carmarket.com',
          '$2b$12$lmV.4cz1TeM8WxOzaYXFG.gIQ3t0IHhRHPn57cYNJUHSTaNyJlhDi', -- Moderator123!
          'Content', 'Moderator', '+1234567891',
          'user', true, true, 'local',
          COALESCE((SELECT "createdAt" FROM users WHERE email = 'moderator@carmarket.com'), CURRENT_TIMESTAMP),
          CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          "firstName" = EXCLUDED."firstName",
          "lastName" = EXCLUDED."lastName",
          "phoneNumber" = EXCLUDED."phoneNumber",
          role = EXCLUDED.role,
          "isActive" = EXCLUDED."isActive",
          "isEmailVerified" = EXCLUDED."isEmailVerified",
          "updatedAt" = CURRENT_TIMESTAMP;
    `);

    // ========================================
    // Step 3: Assign 'super_admin' role to Super Admin user
    // (logic khớp hoàn toàn với file .sql)
    // ========================================
    await queryRunner.query(`
      DO $$
      DECLARE
          v_user_id UUID;
          v_role_id UUID;
          v_existing_id UUID;
      BEGIN
          -- Get user and role IDs
          SELECT id INTO v_user_id FROM users WHERE email = 'superadmin@carmarket.com';
          SELECT id INTO v_role_id FROM roles WHERE name = 'super_admin';
          
          IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'User superadmin@carmarket.com not found';
          END IF;
          
          IF v_role_id IS NULL THEN
              RAISE EXCEPTION 'Role super_admin not found. Please run RBAC seed first.';
          END IF;
          
          -- Check if assignment already exists
          SELECT id INTO v_existing_id 
          FROM user_roles 
          WHERE "userId" = v_user_id AND "roleId" = v_role_id;
          
          IF v_existing_id IS NOT NULL THEN
              -- Update existing assignment
              UPDATE user_roles
              SET "isActive" = true,
                  "assignedBy" = v_user_id,
                  "updatedAt" = CURRENT_TIMESTAMP
              WHERE id = v_existing_id;
          ELSE
              -- Insert new assignment
              INSERT INTO user_roles (
                  "userId",
                  "roleId",
                  "assignedBy",
                  "isActive"
              ) VALUES (
                  v_user_id,
                  v_role_id,
                  v_user_id, -- Self-assigned
                  true
              );
          END IF;
      END $$;
    `);

    // ========================================
    // Step 4: Assign 'moderator' role to Moderator user
    // (logic khớp hoàn toàn với file .sql)
    // ========================================
    await queryRunner.query(`
      DO $$
      DECLARE
          v_user_id UUID;
          v_role_id UUID;
          v_existing_id UUID;
      BEGIN
          -- Get user and role IDs
          SELECT id INTO v_user_id FROM users WHERE email = 'moderator@carmarket.com';
          SELECT id INTO v_role_id FROM roles WHERE name = 'moderator';
          
          IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'User moderator@carmarket.com not found';
          END IF;
          
          IF v_role_id IS NULL THEN
              RAISE EXCEPTION 'Role moderator not found. Please run RBAC seed first.';
          END IF;
          
          -- Check if assignment already exists
          SELECT id INTO v_existing_id 
          FROM user_roles 
          WHERE "userId" = v_user_id AND "roleId" = v_role_id;
          
          IF v_existing_id IS NOT NULL THEN
              -- Update existing assignment
              UPDATE user_roles
              SET "isActive" = true,
                  "assignedBy" = v_user_id,
                  "updatedAt" = CURRENT_TIMESTAMP
              WHERE id = v_existing_id;
          ELSE
              -- Insert new assignment
              INSERT INTO user_roles (
                  "userId",
                  "roleId",
                  "assignedBy",
                  "isActive"
              ) VALUES (
                  v_user_id,
                  v_role_id,
                  v_user_id, -- Self-assigned
                  true
              );
          END IF;
      END $$;
    `);

    // (Optional) Có thể bỏ console.log để giống script SQL “im lặng”
    console.log('✅ Seed Super Admin and Moderator Migration Completed Successfully');

    
    // ========================================
    // Step 5: VERIFY / LOG RESULTS (console)
    // ========================================

    const verification = await queryRunner.query(`
        SELECT '=== VERIFICATION ===' AS status;
      `);
      console.log(verification[0].status);
  
      // ---- Super Admin verification
      const superAdmin = await queryRunner.query(`
        SELECT 
            u.id,
            u.email,
            u."firstName",
            u."lastName",
            u.role AS legacy_role,
            u."isActive",
            u."isEmailVerified",
            r.name AS rbac_role,
            ur."isActive" AS role_active
        FROM users u
        LEFT JOIN user_roles ur ON ur."userId" = u.id AND ur."isActive" = true
        LEFT JOIN roles r ON r.id = ur."roleId"
        WHERE u.email = 'superadmin@carmarket.com';
      `);
      console.log('Super Admin:', JSON.stringify(superAdmin, null, 2));
  
      // ---- Moderator verification
      const moderator = await queryRunner.query(`
        SELECT 
            u.id,
            u.email,
            u."firstName",
            u."lastName",
            u.role AS legacy_role,
            u."isActive",
            u."isEmailVerified",
            r.name AS rbac_role,
            ur."isActive" AS role_active
        FROM users u
        LEFT JOIN user_roles ur ON ur."userId" = u.id AND ur."isActive" = true
        LEFT JOIN roles r ON r.id = ur."roleId"
        WHERE u.email = 'moderator@carmarket.com';
      `);
      console.log('Moderator:', JSON.stringify(moderator, null, 2));
  
      // ---- Summary
      const summary = await queryRunner.query(`
        SELECT '=== SUMMARY ===' AS status;
      `);
      console.log(summary[0].status);
  
      console.log({
        user_type: 'Super Admin',
        email: 'superadmin@carmarket.com',
        password: 'SuperAdmin123!',
        role: 'super_admin',
      });
  
      console.log({
        user_type: 'Moderator',
        email: 'moderator@carmarket.com',
        password: 'Moderator123!',
        role: 'moderator',
      });
  
      const done = await queryRunner.query(`
        SELECT '✅ Users seeded successfully!' AS message;
      `);
      console.log(done[0].message);  
  }


  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert logic: Delete the users created above
    // Cascading delete will handle the user_roles removal
    await queryRunner.query(`
      DELETE FROM users 
      WHERE email IN ('superadmin@carmarket.com', 'moderator@carmarket.com');
    `);
    console.log('✅ Reverted Super Admin and Moderator Seeding');
  }
}