-- ========================================
-- ADD PHONE VERIFICATION DEADLINE COLUMN
-- ========================================
-- This script adds the phone_verification_deadline column to seller_verifications table
-- This field is used to track the deadline for re-verifying phone number after it's changed

ALTER TABLE seller_verifications 
ADD COLUMN IF NOT EXISTS "phoneVerificationDeadline" TIMESTAMP;

COMMENT ON COLUMN seller_verifications."phoneVerificationDeadline" IS 'Deadline for re-verifying phone number after it was changed. If not verified by this date, verification status will be revoked.';

