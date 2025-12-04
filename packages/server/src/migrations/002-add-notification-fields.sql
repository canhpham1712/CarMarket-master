-- Migration: Add notification fields and tables
-- Run this SQL script manually if migration fails due to permissions

-- Add groupId column to notifications table
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "groupId" uuid;

-- Create index on groupId
CREATE INDEX IF NOT EXISTS "IDX_notifications_groupId" ON "notifications" ("groupId");

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "preferences" jsonb NOT NULL DEFAULT '{}',
  "quietHours" jsonb,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_notification_preferences_userId" UNIQUE ("userId"),
  CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id")
);

-- Create index on userId for notification_preferences
CREATE INDEX IF NOT EXISTS "IDX_notification_preferences_userId" ON "notification_preferences" ("userId");

-- Create notification_delivery_logs table
CREATE TABLE IF NOT EXISTS "notification_delivery_logs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "notificationId" uuid NOT NULL,
  "channel" varchar NOT NULL,
  "status" varchar NOT NULL DEFAULT 'pending',
  "attemptedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "deliveredAt" TIMESTAMP,
  "error" text,
  "retryCount" integer NOT NULL DEFAULT 0,
  CONSTRAINT "PK_notification_delivery_logs" PRIMARY KEY ("id")
);

-- Create indexes on notification_delivery_logs
CREATE INDEX IF NOT EXISTS "IDX_notification_delivery_logs_notificationId" ON "notification_delivery_logs" ("notificationId");
CREATE INDEX IF NOT EXISTS "IDX_notification_delivery_logs_channel" ON "notification_delivery_logs" ("channel");
CREATE INDEX IF NOT EXISTS "IDX_notification_delivery_logs_status" ON "notification_delivery_logs" ("status", "attemptedAt");

-- Add additional indexes to notifications table for performance
CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_type" ON "notifications" ("userId", "type");
CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_isRead_createdAt" ON "notifications" ("userId", "isRead", "createdAt");

