-- Add buyerId to transactions table for seller rating system
-- This script adds the buyerId column to track which user purchased from the seller

ALTER TABLE transactions
ADD COLUMN "buyerId" UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions("buyerId");

-- Add comment to explain the column
COMMENT ON COLUMN transactions."buyerId" IS 'The user who purchased the listing (buyer). Required for seller rating system.';

