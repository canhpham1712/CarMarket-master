-- ========================================
-- 16. LISTING PROMOTIONS TABLE
-- ========================================
CREATE TABLE listing_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "listingId" UUID NOT NULL REFERENCES listing_details(id) ON DELETE CASCADE,
    "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "packageType" VARCHAR(20) NOT NULL CHECK ("packageType" IN (
        '1_day', '3_days', '7_days'
    )),
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'expired', 'cancelled'
    )),
    "paymentMethod" VARCHAR(20) CHECK ("paymentMethod" IN (
        'payos', 'momo', 'vnpay', 'stripe', 'bank_transfer'
    )),
    "paymentReference" VARCHAR(255),
    "paymentTransactionId" VARCHAR(255),
    "paymentStatus" VARCHAR(20) DEFAULT 'pending' CHECK ("paymentStatus" IN (
        'pending', 'completed', 'failed', 'refunded'
    )),
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 17. PROMOTION PRICING TABLE
-- ========================================
CREATE TABLE promotion_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "packageType" VARCHAR(20) UNIQUE NOT NULL CHECK ("packageType" IN (
        '1_day', '3_days', '7_days'
    )),
    price DECIMAL(12,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_listing_promotions_listing_id ON listing_promotions("listingId");
CREATE INDEX idx_listing_promotions_seller_id ON listing_promotions("sellerId");
CREATE INDEX idx_listing_promotions_status ON listing_promotions(status);
CREATE INDEX idx_listing_promotions_end_date ON listing_promotions("endDate");
CREATE INDEX idx_listing_promotions_active ON listing_promotions(status, "endDate") 
    WHERE status = 'active';

-- Add comments for documentation
COMMENT ON TABLE listing_promotions IS 'Stores promotion records for listings';
COMMENT ON TABLE promotion_pricing IS 'Stores pricing configuration for promotion packages';

