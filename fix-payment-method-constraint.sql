-- ========================================
-- Fix paymentMethod constraint to include 'payos' and 'momo'
-- ========================================
-- This script updates the paymentMethod check constraint to allow
-- all payment methods: payos, momo, vnpay, stripe, bank_transfer

-- Step 1: Check current constraint definition
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'listing_promotions'::regclass
    AND conname LIKE '%paymentMethod%';

-- Step 2: Drop ALL existing paymentMethod constraints (in case there are multiple)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'listing_promotions'::regclass 
        AND conname LIKE '%paymentMethod%'
    ) LOOP
        EXECUTE 'ALTER TABLE listing_promotions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Step 3: Check if column uses enum type (TypeORM might create enum type)
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%payment%method%'
ORDER BY e.enumsortorder;

-- Step 4: If enum type exists, add missing values
DO $$
DECLARE
    enum_type_name TEXT;
BEGIN
    -- Find enum type name
    SELECT typname INTO enum_type_name
    FROM pg_type 
    WHERE typname LIKE '%payment%method%' 
    LIMIT 1;
    
    IF enum_type_name IS NOT NULL THEN
        -- Add 'payos' if not exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'payos' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = enum_type_name)
        ) THEN
            EXECUTE 'ALTER TYPE ' || quote_ident(enum_type_name) || ' ADD VALUE ''payos''';
            RAISE NOTICE 'Added payos to enum type: %', enum_type_name;
        END IF;
        
        -- Add 'momo' if not exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'momo' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = enum_type_name)
        ) THEN
            EXECUTE 'ALTER TYPE ' || quote_ident(enum_type_name) || ' ADD VALUE ''momo''';
            RAISE NOTICE 'Added momo to enum type: %', enum_type_name;
        END IF;
    ELSE
        -- No enum type, use CHECK constraint instead
        ALTER TABLE listing_promotions 
            ADD CONSTRAINT listing_promotions_paymentMethod_check 
            CHECK (
                "paymentMethod" IN ('payos', 'momo', 'vnpay', 'stripe', 'bank_transfer') 
                OR "paymentMethod" IS NULL
            );
        RAISE NOTICE 'Created CHECK constraint for paymentMethod';
    END IF;
END $$;

-- Step 5: Verify the final state
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'listing_promotions'::regclass
    AND (conname LIKE '%paymentMethod%' OR conname LIKE '%payment_method%');

-- Step 6: Show column type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'listing_promotions' 
    AND column_name = 'paymentMethod';

