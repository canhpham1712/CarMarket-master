-- Recommendations Feature Database Schema
-- This script creates tables for the recommendation system

-- ========================================
-- USER_RECOMMENDATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS user_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "listingId" UUID NOT NULL REFERENCES listing_details(id) ON DELETE CASCADE,
    score DECIMAL(10, 6) NOT NULL,
    reason TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "listingId")
);

-- ========================================
-- USER_SEARCH_HISTORY TABLE (Optional)
-- ========================================
CREATE TABLE IF NOT EXISTS user_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "searchQuery" TEXT,
    filters JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- USER_VIEW_HISTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS user_view_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "listingId" UUID NOT NULL REFERENCES listing_details(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'click_contact', 'click_favorite', 'long_view')),
    "viewDuration" INTEGER,
    "viewedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "listingId", action, "viewedAt")
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_user_recommendations_user ON user_recommendations("userId");
CREATE INDEX idx_user_recommendations_score ON user_recommendations("userId", score DESC);
CREATE INDEX idx_user_recommendations_listing ON user_recommendations("listingId");
CREATE INDEX idx_search_history_user ON user_search_history("userId", "createdAt" DESC);
CREATE INDEX idx_view_history_user ON user_view_history("userId", "viewedAt" DESC);
CREATE INDEX idx_view_history_listing ON user_view_history("listingId");
CREATE INDEX idx_view_history_user_listing ON user_view_history("userId", "listingId");

-- Grant permissions
GRANT ALL ON user_recommendations TO carmarket_user;
GRANT ALL ON user_search_history TO carmarket_user;
GRANT ALL ON user_view_history TO carmarket_user;

