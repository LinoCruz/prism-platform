-- Add personal_email column to users
-- This stores the user's personal email address (used for Hubstaff).
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email varchar;
