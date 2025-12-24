/*
  # Fix RLS policies and ensure proper access

  1. Changes
    - Drop existing policies
    - Create new policies that allow proper access to users table
    - Ensure admin user exists
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable write access for admins" ON users;

-- Create new policies for users table
CREATE POLICY "Allow public read access to users"
  ON users
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to users"
  ON users
  FOR INSERT
  WITH CHECK (true);

-- Ensure admin user exists
INSERT INTO users (phone, password, role, name, created_at)
VALUES (
  '0502307500',
  '123456',
  'admin',
  'מנהל מערכת',
  now()
)
ON CONFLICT (phone) DO NOTHING;

-- Add test user for development
INSERT INTO users (phone, password, role, name, created_at)
VALUES (
  '0527488779',
  '123456',
  'worker',
  'עובד בדיקות',
  now()
)
ON CONFLICT (phone) DO NOTHING;