-- ========================================
-- 17. SEED PROMOTION PRICING DATA
-- ========================================
-- Insert default pricing for promotion packages
-- Prices are in VNĐ (Vietnamese Dong)
-- Base price: 20,000 VNĐ/ngày
-- 1 ngày: 20,000 VNĐ
-- 3 ngày: 54,000 VNĐ (tiết kiệm 6,000 VNĐ - 10%)
-- 7 ngày: 112,000 VNĐ (tiết kiệm 28,000 VNĐ - 20%)

INSERT INTO promotion_pricing ("packageType", price, "durationDays", "isActive") VALUES
    ('1_day', 20000, 1, true),
    ('3_days', 54000, 3, true),
    ('7_days', 112000, 7, true)
ON CONFLICT ("packageType") DO UPDATE
SET 
    price = EXCLUDED.price,
    "durationDays" = EXCLUDED."durationDays",
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Verify the data
SELECT 
    "packageType",
    price,
    "durationDays",
    ROUND(price / "durationDays", 2) as "pricePerDay",
    "isActive"
FROM promotion_pricing
ORDER BY "durationDays";

