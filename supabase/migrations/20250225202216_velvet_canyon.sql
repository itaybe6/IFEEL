/*
  # Fix admin user and password

  1. Changes
    - Add admin user with correct phone and password
    - Update password column to be required
*/

-- First ensure password column exists and is required
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password text;

-- Update password column to be required
ALTER TABLE users 
ALTER COLUMN password SET NOT NULL;

-- Insert admin user if not exists
INSERT INTO users (phone, role, name, password, created_at)
VALUES (
  '0502307500',
  'admin',
  'מנהל מערכת',
  '123456',
  now()
)
ON CONFLICT (phone) 
DO UPDATE SET password = '123456'
WHERE users.phone = '0502307500';