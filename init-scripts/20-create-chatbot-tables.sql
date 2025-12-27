-- ========================================
-- 20. CHATBOT CONVERSATIONS TABLE
-- ========================================
CREATE TABLE chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "deviceId" VARCHAR(255),
    "sessionId" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_chatbot_conversations_user_id ON chatbot_conversations("userId");
CREATE INDEX idx_chatbot_conversations_device_id ON chatbot_conversations("deviceId");
CREATE INDEX idx_chatbot_conversations_last_message_at ON chatbot_conversations("lastMessageAt" DESC);

-- ========================================
-- 21. CHATBOT MESSAGES TABLE
-- ========================================
CREATE TABLE chatbot_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    sender VARCHAR(20) DEFAULT 'user' CHECK (sender IN ('user', 'assistant')),
    "conversationId" UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_chatbot_messages_conversation_id ON chatbot_messages("conversationId");
CREATE INDEX idx_chatbot_messages_created_at ON chatbot_messages("createdAt" DESC);

