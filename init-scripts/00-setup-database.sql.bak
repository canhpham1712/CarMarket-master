-- CarMarket Complete Database Setup
-- This script runs all database initialization scripts in the correct order

-- ========================================
-- STEP 1: Initialize Database and User
-- ========================================
\echo 'Step 1: Creating database and user...'
\i 01-init.sql

-- ========================================
-- STEP 2: Create All Tables
-- ========================================
\echo 'Step 2: Creating all tables...'
\i 02-create-tables.sql

-- ========================================
-- STEP 3: Insert Seed Data
-- ========================================
\echo 'Step 3: Inserting seed data...'
\i 03-seed-data.sql

-- ========================================
-- VERIFICATION
-- ========================================
\echo 'Verifying database setup...'

-- Check if all tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check row counts for main tables
\echo 'Table row counts:'
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'car_makes', COUNT(*) FROM car_makes
UNION ALL
SELECT 'car_models', COUNT(*) FROM car_models
UNION ALL
SELECT 'car_metadata', COUNT(*) FROM car_metadata
UNION ALL
SELECT 'car_details', COUNT(*) FROM car_details
UNION ALL
SELECT 'listing_details', COUNT(*) FROM listing_details
UNION ALL
SELECT 'car_images', COUNT(*) FROM car_images
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs;

\echo 'Database setup completed successfully!'
\echo 'You can now start the CarMarket application.'



