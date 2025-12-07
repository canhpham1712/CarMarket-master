-- Create a new admin user
-- Email: admin@test.com
-- Password: admin123

-- First, delete if exists (optional - remove this if you don't want to delete existing)
DELETE FROM users WHERE email = 'admin@test.com';

-- Insert new admin user
INSERT INTO users (
    email, 
    password, 
    "firstName", 
    "lastName", 
    "phoneNumber", 
    role, 
    "isActive",
    "isEmailVerified"
) VALUES (
    'admin@test.com',
    '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG',
    'Admin',
    'Test',
    '+1234567890',
    'admin',
    true,
    true
);

-- Verify the new admin was created
SELECT 
    id,
    email,
    "firstName",
    "lastName",
    role,
    "isActive",
    "isEmailVerified",
    "createdAt"
FROM users 
WHERE email = 'admin@test.com';

-- Show success message
SELECT 'Admin user created successfully!' AS message;
SELECT 'Email: admin@test.com' AS login_info;
SELECT 'Password: admin123' AS login_info;




