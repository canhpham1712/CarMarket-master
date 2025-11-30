-- Grant permissions for phone_verification_otps table
-- Run this script if you get "permission denied" errors

-- Grant all privileges on the table
GRANT ALL PRIVILEGES ON TABLE phone_verification_otps TO carmarket_user;

-- If using sequences (for auto-increment IDs), grant sequence privileges
-- Note: This table uses UUID, so sequence might not be needed, but included for completeness
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'phone_verification_otps_id_seq') THEN
        GRANT USAGE, SELECT ON SEQUENCE phone_verification_otps_id_seq TO carmarket_user;
    END IF;
END $$;

-- Also grant on default privileges for future tables (optional)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO carmarket_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO carmarket_user;

