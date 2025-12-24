/*
  # Update authentication system
  
  1. Changes
    - Add email field to users table
    - Update users table constraints
    - Update existing admin user
*/

-- Add email field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text UNIQUE;
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Insert admin user with email
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT DO NOTHING;

-- Get the user id from the auth.users table
DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'admin@example.com';
  
  -- Insert into public.users table
  INSERT INTO public.users (id, email, role, name, created_at)
  VALUES (
    auth_user_id,
    'admin@example.com',
    'admin',
    'System Admin',
    now()
  ) ON CONFLICT DO NOTHING;
END $$;