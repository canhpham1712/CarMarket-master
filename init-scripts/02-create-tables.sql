-- CarMarket Database Schema
-- This script creates all necessary tables for the CarMarket application

-- IMPORTANT: Make sure you are connected to the 'carmarket' database before running this script
-- You can connect by running: \c carmarket

-- Enable UUID extension (requires superuser privileges)
-- If you get permission errors, run this as postgres superuser first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant usage on schema to carmarket_user
GRANT ALL ON SCHEMA public TO carmarket_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO carmarket_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO carmarket_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO carmarket_user;

-- ========================================
-- 1. USERS TABLE
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "phoneNumber" VARCHAR(20),
    "profileImage" VARCHAR(500),
    bio TEXT,
    location VARCHAR(255),
    "dateOfBirth" DATE,
    "isActive" BOOLEAN DEFAULT true,
    "isEmailVerified" BOOLEAN DEFAULT false,
    "emailVerificationToken" VARCHAR(255),
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. CAR MAKES TABLE
-- ========================================
CREATE TABLE car_makes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    "displayName" VARCHAR(100),
    "logoUrl" VARCHAR(500),
    "isActive" BOOLEAN DEFAULT true,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. CAR MODELS TABLE
-- ========================================
CREATE TABLE car_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(100),
    "isActive" BOOLEAN DEFAULT true,
    "sortOrder" INTEGER DEFAULT 0,
    "bodyStyles" TEXT[] DEFAULT '{}',
    "defaultBodyStyle" VARCHAR(50),
    "makeId" UUID NOT NULL REFERENCES car_makes(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4. CAR METADATA TABLE (for dropdown options)
-- ========================================
CREATE TABLE car_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'fuel_type', 'transmission_type', 'body_type', 
        'condition', 'price_type', 'car_feature', 'color'
    )),
    value VARCHAR(100) NOT NULL,
    "displayValue" VARCHAR(100),
    description TEXT,
    "iconUrl" VARCHAR(500),
    "isActive" BOOLEAN DEFAULT true,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 5. CAR DETAILS TABLE
-- ========================================
CREATE TABLE car_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    "bodyType" VARCHAR(50) NOT NULL CHECK ("bodyType" IN (
        'sedan', 'hatchback', 'suv', 'coupe', 'convertible', 
        'wagon', 'pickup', 'van', 'minivan'
    )),
    "fuelType" VARCHAR(50) NOT NULL CHECK ("fuelType" IN (
        'petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng'
    )),
    transmission VARCHAR(50) NOT NULL CHECK (transmission IN (
        'manual', 'automatic', 'cvt', 'semi_automatic'
    )),
    "engineSize" DECIMAL(10,2) NOT NULL,
    "enginePower" INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    color VARCHAR(50) NOT NULL,
    "numberOfDoors" INTEGER DEFAULT 4,
    "numberOfSeats" INTEGER DEFAULT 5,
    condition VARCHAR(50) NOT NULL CHECK (condition IN (
        'excellent', 'very_good', 'good', 'fair', 'poor'
    )),
    vin VARCHAR(20),
    "registrationNumber" VARCHAR(50),
    "previousOwners" INTEGER,
    "hasAccidentHistory" BOOLEAN DEFAULT false,
    "hasServiceHistory" BOOLEAN DEFAULT false,
    description TEXT,
    features TEXT[],
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 6. CAR IMAGES TABLE
-- ========================================
CREATE TABLE car_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(50) DEFAULT 'exterior' CHECK (type IN (
        'exterior', 'interior', 'engine', 'document', 'other'
    )),
    "sortOrder" INTEGER DEFAULT 0,
    "isPrimary" BOOLEAN DEFAULT false,
    "fileSize" INTEGER,
    "mimeType" VARCHAR(100),
    alt VARCHAR(255),
    "carDetailId" UUID NOT NULL REFERENCES car_details(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 6.1. CAR VIDEOS TABLE
-- ========================================
CREATE TABLE car_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    "sortOrder" INTEGER DEFAULT 0,
    "isPrimary" BOOLEAN DEFAULT false,
    "fileSize" BIGINT,
    "mimeType" VARCHAR(100),
    alt VARCHAR(255),
    duration INTEGER,
    "thumbnailUrl" VARCHAR(500),
    "carDetailId" UUID NOT NULL REFERENCES car_details(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. LISTING DETAILS TABLE
-- ========================================
CREATE TABLE listing_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    "priceType" VARCHAR(20) DEFAULT 'negotiable' CHECK ("priceType" IN (
        'fixed', 'negotiable', 'auction'
    )),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending', 'approved', 'rejected', 'sold', 'inactive'
    )),
    location VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    "postalCode" VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    "viewCount" INTEGER DEFAULT 0,
    "favoriteCount" INTEGER DEFAULT 0,
    "inquiryCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "isFeatured" BOOLEAN DEFAULT false,
    "isUrgent" BOOLEAN DEFAULT false,
    "expiresAt" TIMESTAMP,
    "approvedAt" TIMESTAMP,
    "rejectedAt" TIMESTAMP,
    "rejectionReason" TEXT,
    "soldAt" TIMESTAMP,
    "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "carDetailId" UUID NOT NULL REFERENCES car_details(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 8. TRANSACTIONS TABLE
-- ========================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "transactionNumber" VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'completed', 'cancelled', 'refunded'
    )),
    "paymentMethod" VARCHAR(20) NOT NULL CHECK ("paymentMethod" IN (
        'cash', 'bank_transfer', 'credit_card', 'financing', 'other'
    )),
    "paymentReference" VARCHAR(255),
    notes TEXT,
    "meetingLocation" VARCHAR(255),
    "scheduledMeetingDate" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "cancelledAt" TIMESTAMP,
    "cancellationReason" TEXT,
    "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "listingId" UUID NOT NULL REFERENCES listing_details(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 9. CHAT CONVERSATIONS TABLE
-- ========================================
CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP,
    "isBuyerTyping" BOOLEAN DEFAULT false,
    "isSellerTyping" BOOLEAN DEFAULT false,
    "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "listingId" UUID NOT NULL REFERENCES listing_details(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("buyerId", "sellerId", "listingId")
);

-- ========================================
-- 10. CHAT MESSAGES TABLE
-- ========================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN (
        'text', 'image', 'system'
    )),
    "isRead" BOOLEAN DEFAULT false,
    "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "conversationId" UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 11. FAVORITES TABLE
-- ========================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "listingId" UUID NOT NULL REFERENCES listing_details(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "listingId")
);

-- ========================================
-- 12. LISTING PENDING CHANGES TABLE
-- ========================================
CREATE TABLE listing_pending_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "listingId" UUID NOT NULL REFERENCES listing_details(id) ON DELETE CASCADE,
    "changedByUserId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changes JSONB NOT NULL,
    "originalValues" JSONB,
    "isApplied" BOOLEAN DEFAULT false,
    "appliedAt" TIMESTAMP,
    "appliedByUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 13. ACTIVITY LOGS TABLE
-- ========================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) DEFAULT 'info' CHECK (level IN (
        'info', 'warning', 'error', 'debug'
    )),
    category VARCHAR(30) NOT NULL CHECK (category IN (
        'user_action', 'listing_action', 'admin_action', 'system_event',
        'authentication', 'payment', 'chat', 'favorite'
    )),
    message VARCHAR(500) NOT NULL,
    description TEXT,
    metadata JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "targetUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "listingId" UUID,
    "conversationId" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users("isActive");

-- Car makes and models indexes
CREATE INDEX idx_car_models_make_id ON car_models("makeId");
CREATE INDEX idx_car_models_is_active ON car_models("isActive");

-- Car metadata indexes
CREATE INDEX idx_car_metadata_type ON car_metadata(type);
CREATE INDEX idx_car_metadata_is_active ON car_metadata("isActive");

-- Car details indexes
CREATE INDEX idx_car_details_make_model ON car_details(make, model);
CREATE INDEX idx_car_details_year ON car_details(year);
CREATE INDEX idx_car_details_fuel_type ON car_details("fuelType");
CREATE INDEX idx_car_details_transmission ON car_details(transmission);
CREATE INDEX idx_car_details_body_type ON car_details("bodyType");
CREATE INDEX idx_car_details_condition ON car_details(condition);

-- Car images indexes
CREATE INDEX idx_car_images_car_detail_id ON car_images("carDetailId");
CREATE INDEX idx_car_images_is_primary ON car_images("isPrimary");

-- Listing details indexes
CREATE INDEX idx_listing_details_seller_id ON listing_details("sellerId");
CREATE INDEX idx_listing_details_status ON listing_details(status);
CREATE INDEX idx_listing_details_price ON listing_details(price);
CREATE INDEX idx_listing_details_location ON listing_details(location);
CREATE INDEX idx_listing_details_is_active ON listing_details("isActive");
CREATE INDEX idx_listing_details_is_featured ON listing_details("isFeatured");
CREATE INDEX idx_listing_details_created_at ON listing_details("createdAt");
CREATE INDEX idx_listing_details_expires_at ON listing_details("expiresAt");

-- Transactions indexes
CREATE INDEX idx_transactions_seller_id ON transactions("sellerId");
CREATE INDEX idx_transactions_listing_id ON transactions("listingId");
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions("createdAt");

-- Chat indexes
CREATE INDEX idx_chat_conversations_buyer_id ON chat_conversations("buyerId");
CREATE INDEX idx_chat_conversations_seller_id ON chat_conversations("sellerId");
CREATE INDEX idx_chat_conversations_listing_id ON chat_conversations("listingId");
CREATE INDEX idx_chat_conversations_last_message_at ON chat_conversations("lastMessageAt");

CREATE INDEX idx_chat_messages_conversation_id ON chat_messages("conversationId");
CREATE INDEX idx_chat_messages_sender_id ON chat_messages("senderId");
CREATE INDEX idx_chat_messages_created_at ON chat_messages("createdAt");
CREATE INDEX idx_chat_messages_is_read ON chat_messages("isRead");

-- Favorites indexes
CREATE INDEX idx_favorites_user_id ON favorites("userId");
CREATE INDEX idx_favorites_listing_id ON favorites("listingId");

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs("userId");
CREATE INDEX idx_activity_logs_category ON activity_logs(category);
CREATE INDEX idx_activity_logs_level ON activity_logs(level);
CREATE INDEX idx_activity_logs_created_at ON activity_logs("createdAt");
CREATE INDEX idx_activity_logs_listing_id ON activity_logs("listingId");

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updatedAt column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_makes_updated_at BEFORE UPDATE ON car_makes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_models_updated_at BEFORE UPDATE ON car_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_metadata_updated_at BEFORE UPDATE ON car_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_details_updated_at BEFORE UPDATE ON car_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_details_updated_at BEFORE UPDATE ON listing_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_pending_changes_updated_at BEFORE UPDATE ON listing_pending_changes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- GRANTS
-- ========================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO carmarket_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO carmarket_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO carmarket_user;
