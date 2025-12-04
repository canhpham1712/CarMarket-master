-- Update passwords for existing users
-- New password for all users: admin123
-- Run this if you already have users in the database

UPDATE users SET password = '$2b$12$5HYF4Zel97OFRi5w2BvB9eC.skTB0qCZ5GKaIm26zATcENWGRXThG' 
WHERE email IN (
    'admin@carmarket.com',
    'john.doe@example.com',
    'jane.smith@example.com',
    'bob.wilson@example.com'
);

-- Verify the update
SELECT email, "isEmailVerified" FROM users;




