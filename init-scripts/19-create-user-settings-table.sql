-- User Settings Table
-- This script creates the user_settings table for storing user preferences and settings

-- ========================================
-- USER SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on userId
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings("userId");

-- Create index on settings JSONB for better query performance
CREATE INDEX IF NOT EXISTS idx_user_settings_settings ON user_settings USING GIN(settings);

-- Grant permissions to carmarket_user
GRANT ALL ON user_settings TO carmarket_user;

-- Grant permissions on sequences (for UUID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carmarket_user;

