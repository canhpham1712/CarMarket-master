-- CarMarket Database Initialization
-- This script creates the database, user, and sets up basic permissions

-- Create database and user
CREATE USER carmarket_user WITH PASSWORD 'carmarket_password';
CREATE DATABASE carmarket OWNER carmarket_user;
GRANT ALL PRIVILEGES ON DATABASE carmarket TO carmarket_user;

-- Connect to the carmarket database
\c carmarket;

-- Allow connections from any host with trust authentication for development
-- This will be applied to pg_hba.conf during initialization

-- Note: After running this script, you should run:
-- 1. 02-create-tables.sql - Creates all the necessary tables
-- 2. 03-seed-data.sql - Populates with initial data