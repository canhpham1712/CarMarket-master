-- Add COMMENT_REPORTED notification type to the notifications table
-- This script updates the CHECK constraint to include the new notification type

-- Drop the existing check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new check constraint with comment_reported included
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'listing_approved', 
    'listing_rejected', 
    'new_message', 
    'listing_sold', 
    'new_inquiry', 
    'comment_reported',
    'system'
));

