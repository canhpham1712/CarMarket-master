-- Notification Preferences and Delivery Logs Tables
-- This script creates tables for notification preferences and delivery logs

-- ========================================
-- NOTIFICATION PREFERENCES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    "quietHours" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on userId
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences("userId");

-- ========================================
-- NOTIFICATION DELIVERY LOGS TABLE
-- ========================================
-- Create enum types for delivery channel and status
DO $$ BEGIN
    CREATE TYPE delivery_channel AS ENUM ('inApp', 'email', 'push');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed', 'delivered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "notificationId" UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel delivery_channel NOT NULL,
    status delivery_status NOT NULL DEFAULT 'pending',
    "attemptedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP,
    error TEXT,
    "retryCount" INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_id ON notification_delivery_logs("notificationId");
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_channel ON notification_delivery_logs("notificationId", channel);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_status_attempted ON notification_delivery_logs(status, "attemptedAt");

-- Grant permissions to carmarket_user
GRANT ALL ON notification_preferences TO carmarket_user;
GRANT ALL ON notification_delivery_logs TO carmarket_user;

-- Grant permissions on sequences (for UUID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carmarket_user;

