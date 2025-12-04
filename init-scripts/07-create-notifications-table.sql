-- Notifications Feature Database Schema
-- This script creates the notifications table for user notifications

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'listing_approved', 'listing_rejected', 'new_message', 
        'listing_sold', 'new_inquiry', 'comment_reported', 'system'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "relatedListingId" UUID REFERENCES listing_details(id) ON DELETE SET NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_notifications_user_id ON notifications("userId");
CREATE INDEX idx_notifications_user_id_is_read ON notifications("userId", "isRead");
CREATE INDEX idx_notifications_user_id_created_at ON notifications("userId", "createdAt");
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_related_listing_id ON notifications("relatedListingId");

-- Grant permissions
GRANT ALL ON notifications TO carmarket_user;

