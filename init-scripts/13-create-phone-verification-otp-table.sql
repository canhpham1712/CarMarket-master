-- Create phone_verification_otps table for OTP-based phone verification
-- This table stores OTP codes (hashed) for phone number verification

CREATE TABLE IF NOT EXISTS phone_verification_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "otpCode" VARCHAR(255) NOT NULL, -- Hashed OTP using bcrypt
    "attempts" INTEGER DEFAULT 0,
    "maxAttempts" INTEGER DEFAULT 3,
    "expiresAt" TIMESTAMP NOT NULL,
    "verifiedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_active_otp UNIQUE ("userId", "phoneNumber")
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_phone_otp_user_phone ON phone_verification_otps("userId", "phoneNumber");
CREATE INDEX IF NOT EXISTS idx_phone_otp_expires ON phone_verification_otps("expiresAt");

-- Grant permissions to carmarket_user
GRANT ALL PRIVILEGES ON TABLE phone_verification_otps TO carmarket_user;
GRANT USAGE, SELECT ON SEQUENCE phone_verification_otps_id_seq TO carmarket_user;

-- Add comment
COMMENT ON TABLE phone_verification_otps IS 'Stores OTP codes for phone number verification. OTP codes are hashed using bcrypt for security.';
COMMENT ON COLUMN phone_verification_otps."otpCode" IS 'Hashed OTP code using bcrypt. Never store plain text OTP.';
COMMENT ON COLUMN phone_verification_otps."expiresAt" IS 'OTP expiration time. Typically 5 minutes from creation.';
COMMENT ON COLUMN phone_verification_otps."maxAttempts" IS 'Maximum number of verification attempts allowed. Default is 3.';

