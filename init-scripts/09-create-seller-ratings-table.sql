-- Seller Ratings Table
-- This script creates the seller_ratings table for the seller rating system

CREATE TABLE seller_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "transactionId" UUID REFERENCES transactions(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("buyerId", "sellerId", "transactionId")
);

-- Create indexes for better query performance
CREATE INDEX idx_seller_ratings_seller_id ON seller_ratings("sellerId");
CREATE INDEX idx_seller_ratings_buyer_id ON seller_ratings("buyerId");
CREATE INDEX idx_seller_ratings_transaction_id ON seller_ratings("transactionId");

-- Grant permissions to carmarket_user
GRANT ALL ON TABLE seller_ratings TO carmarket_user;

-- Add comments to explain the table
COMMENT ON TABLE seller_ratings IS 'Stores ratings given by buyers to sellers after completing transactions';
COMMENT ON COLUMN seller_ratings.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN seller_ratings."transactionId" IS 'Optional reference to the transaction. Allows one rating per transaction.';

