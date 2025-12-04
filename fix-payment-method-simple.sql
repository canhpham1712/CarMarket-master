-- ========================================
-- Simple fix for paymentMethod constraint
-- ========================================

-- Step 1: Show current constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'listing_promotions'::regclass
    AND conname LIKE '%paymentMethod%';

-- Step 2: Drop existing constraint
ALTER TABLE listing_promotions 
    DROP CONSTRAINT IF EXISTS listing_promotions_paymentMethod_check;

-- Step 3: Create new constraint with all payment methods
ALTER TABLE listing_promotions 
    ADD CONSTRAINT listing_promotions_paymentMethod_check 
    CHECK (
        "paymentMethod" IS NULL 
        OR "paymentMethod" = 'payos'
        OR "paymentMethod" = 'momo'
        OR "paymentMethod" = 'vnpay'
        OR "paymentMethod" = 'stripe'
        OR "paymentMethod" = 'bank_transfer'
    );

-- Step 4: Verify constraint was created
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'listing_promotions'::regclass
    AND conname = 'listing_promotions_paymentMethod_check';

-- Step 5: Test the constraint (should return no rows if constraint works)
SELECT 
    id,
    "paymentMethod"
FROM listing_promotions
WHERE "paymentMethod" NOT IN ('payos', 'momo', 'vnpay', 'stripe', 'bank_transfer')
    AND "paymentMethod" IS NOT NULL;

