-- ========================================
-- Seed Super Admin and Moderator Users
-- ========================================
-- This script creates/updates Super Admin and Moderator users
-- and assigns them the appropriate roles
--
-- Users created:
-- 1. Super Admin: superadmin@carmarket.com / SuperAdmin123!
-- 2. Moderator: moderator@carmarket.com / Moderator123!
-- ========================================

-- Step 1: Create or update Super Admin user
INSERT INTO users (
    id,
    email,
    password,
    "firstName",
    "lastName",
    "phoneNumber",
    "isActive",
    "isEmailVerified",
    provider,
    "createdAt",
    "updatedAt"
) VALUES (
    COALESCE((SELECT id FROM users WHERE email = 'superadmin@carmarket.com'), uuid_generate_v4()),
    'superadmin@carmarket.com',
    '$2b$12$22XPfsAaoVFNixpvzkAow.DajxY5NPwHdHfY1qifgaT0C1lNDkXci', -- SuperAdmin123!
    'Super',
    'Admin',
    '+1234567890',
    true,
    true,
    'local',
    COALESCE((SELECT "createdAt" FROM users WHERE email = 'superadmin@carmarket.com'), CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    "phoneNumber" = EXCLUDED."phoneNumber",
    "isActive" = EXCLUDED."isActive",
    "isEmailVerified" = EXCLUDED."isEmailVerified",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Step 2: Create or update Moderator user
INSERT INTO users (
    id,
    email,
    password,
    "firstName",
    "lastName",
    "phoneNumber",
    "isActive",
    "isEmailVerified",
    provider,
    "createdAt",
    "updatedAt"
) VALUES (
    COALESCE((SELECT id FROM users WHERE email = 'moderator@carmarket.com'), uuid_generate_v4()),
    'moderator@carmarket.com',
    '$2b$12$lmV.4cz1TeM8WxOzaYXFG.gIQ3t0IHhRHPn57cYNJUHSTaNyJlhDi', -- Moderator123!
    'Content',
    'Moderator',
    '+1234567891',
    true,
    true,
    'local',
    COALESCE((SELECT "createdAt" FROM users WHERE email = 'moderator@carmarket.com'), CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    "phoneNumber" = EXCLUDED."phoneNumber",
    "isActive" = EXCLUDED."isActive",
    "isEmailVerified" = EXCLUDED."isEmailVerified",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Step 3: Assign super_admin role to Super Admin user
-- Check if role assignment already exists
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

-- Step 4: Assign moderator role to Moderator user
-- Check if role assignment already exists
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

-- Step 5: Verify the results
SELECT 
    '=== VERIFICATION ===' AS status;

-- Show Super Admin user and role
SELECT 
    u.id,
    u.email,
    u."firstName",
    u."lastName",
    u."isActive",
    u."isEmailVerified",
    r.name AS rbac_role,
    ur."isActive" AS role_active
FROM users u
LEFT JOIN user_roles ur ON ur."userId" = u.id AND ur."isActive" = true
LEFT JOIN roles r ON r.id = ur."roleId"
WHERE u.email = 'superadmin@carmarket.com';

-- Show Moderator user and role
SELECT 
    u.id,
    u.email,
    u."firstName",
    u."lastName",
    u."isActive",
    u."isEmailVerified",
    r.name AS rbac_role,
    ur."isActive" AS role_active
FROM users u
LEFT JOIN user_roles ur ON ur."userId" = u.id AND ur."isActive" = true
LEFT JOIN roles r ON r.id = ur."roleId"
WHERE u.email = 'moderator@carmarket.com';

-- Summary
SELECT 
    '=== SUMMARY ===' AS status;

SELECT 
    'Super Admin' AS user_type,
    'superadmin@carmarket.com' AS email,
    'SuperAdmin123!' AS password,
    'super_admin' AS role;

SELECT 
    'Moderator' AS user_type,
    'moderator@carmarket.com' AS email,
    'Moderator123!' AS password,
    'moderator' AS role;

SELECT 
    '✅ Users seeded successfully!' AS message;

