-- ========================================
-- SELLER VERIFICATION TABLES
-- ========================================
-- This script creates tables for seller verification system
-- Based on best practices from marketplaces like eBay, Carousell, Chợ Tốt

-- Seller Verification Status Enum
DO $$ BEGIN
    CREATE TYPE seller_verification_status AS ENUM (
        'pending',      -- Verification request submitted, awaiting review
        'in_review',    -- Under admin review
        'approved',     -- Verification approved
        'rejected',     -- Verification rejected
        'expired'       -- Verification expired (if time-limited)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Document Type Enum
DO $$ BEGIN
    CREATE TYPE verification_document_type AS ENUM (
        'identity_card',      -- CMND/CCCD
        'passport',           -- Passport
        'driving_license',    -- Giấy phép lái xe
        'bank_statement',    -- Sao kê ngân hàng
        'address_proof',     -- Giấy tờ chứng minh địa chỉ
        'business_license'   -- Giấy phép kinh doanh (cho doanh nghiệp)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verification Level Enum
DO $$ BEGIN
    CREATE TYPE verification_level AS ENUM (
        'basic',        -- Basic: Email + Phone verified
        'standard',     -- Standard: + Identity document
        'premium'       -- Premium: + Bank account + Address proof
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- SELLER VERIFICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS seller_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Verification Status
    status seller_verification_status DEFAULT 'pending',
    "verificationLevel" verification_level DEFAULT 'basic',
    
    -- Contact Information
    "phoneNumber" VARCHAR(20),
    "isPhoneVerified" BOOLEAN DEFAULT false,
    "phoneVerifiedAt" TIMESTAMP,
    "phoneVerificationDeadline" TIMESTAMP,
    
    -- Identity Information
    "fullName" VARCHAR(255), -- Full name as shown on ID
    "idNumber" VARCHAR(50),  -- CMND/CCCD/Passport number
    "dateOfBirth" DATE,
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Vietnam',
    
    -- Bank Account (optional for premium verification)
    "bankName" VARCHAR(255),
    "bankAccountNumber" VARCHAR(50),
    "accountHolderName" VARCHAR(255),
    "isBankVerified" BOOLEAN DEFAULT false,
    "bankVerifiedAt" TIMESTAMP,
    
    -- Admin Review
    "reviewedBy" UUID REFERENCES users(id),
    "reviewedAt" TIMESTAMP,
    "rejectionReason" TEXT,
    "adminNotes" TEXT,
    
    -- Metadata
    "submittedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP,
    "expiresAt" TIMESTAMP, -- Optional: if verification expires
    
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_verification UNIQUE ("userId")
);

-- ========================================
-- SELLER VERIFICATION DOCUMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS seller_verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "verificationId" UUID NOT NULL REFERENCES seller_verifications(id) ON DELETE CASCADE,
    
    -- Document Information
    "documentType" verification_document_type NOT NULL,
    "documentNumber" VARCHAR(100), -- Document ID number if applicable
    "fileName" VARCHAR(255) NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "fileSize" INTEGER, -- Size in bytes
    "mimeType" VARCHAR(100),
    
    -- Document Status
    "isVerified" BOOLEAN DEFAULT false,
    "verifiedBy" UUID REFERENCES users(id),
    "verifiedAt" TIMESTAMP,
    "rejectionReason" TEXT,
    
    -- Metadata
    "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_seller_verifications_user_id ON seller_verifications("userId");
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON seller_verifications(status);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_level ON seller_verifications("verificationLevel");
CREATE INDEX IF NOT EXISTS idx_seller_verifications_reviewed_by ON seller_verifications("reviewedBy");
CREATE INDEX IF NOT EXISTS idx_seller_verification_documents_verification_id ON seller_verification_documents("verificationId");
CREATE INDEX IF NOT EXISTS idx_seller_verification_documents_type ON seller_verification_documents("documentType");

-- ========================================
-- GRANTS
-- ========================================
GRANT ALL ON TABLE seller_verifications TO carmarket_user;
GRANT ALL ON TABLE seller_verification_documents TO carmarket_user;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE seller_verifications IS 'Stores seller verification requests and status';
COMMENT ON TABLE seller_verification_documents IS 'Stores uploaded documents for seller verification';
COMMENT ON COLUMN seller_verifications."verificationLevel" IS 'Level of verification: basic (email+phone), standard (+ID), premium (+bank+address)';
COMMENT ON COLUMN seller_verifications.status IS 'Current status of verification request';
COMMENT ON COLUMN seller_verification_documents."documentType" IS 'Type of document uploaded for verification';

