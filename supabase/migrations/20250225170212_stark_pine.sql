/*
  # Update authentication system to use email
  
  1. Changes
    - Add email field to users table
    - Make phone field optional
    - Update admin user with email authentication
*/

-- Add email field to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text UNIQUE;
    ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
  END IF;
END $$;

-- Insert admin user with email
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- First check if admin user exists
  SELECT id INTO v_user_id FROM public.users WHERE role = 'admin' LIMIT 1;
  
  -- If no admin exists, create one
  IF v_user_id IS NULL THEN
    INSERT INTO public.users (
      id,
      email,
      role,
      name,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'admin@example.com',
      'admin',
      'מנהל מערכת',
      now()
    );
  END IF;
END $$;