-- ========================================
-- Migration: Add new fields to chatbot_conversations table
-- ========================================

-- Add title column
ALTER TABLE chatbot_conversations 
ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Add deviceId column
ALTER TABLE chatbot_conversations 
ADD COLUMN IF NOT EXISTS "deviceId" VARCHAR(255);

-- Add sessionId column
ALTER TABLE chatbot_conversations 
ADD COLUMN IF NOT EXISTS "sessionId" VARCHAR(255);

-- Create index on deviceId
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_device_id ON chatbot_conversations("deviceId");

