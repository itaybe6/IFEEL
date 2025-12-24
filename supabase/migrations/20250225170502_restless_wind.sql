/*
  # Enable phone authentication

  1. Changes
    - Enable phone authentication in auth settings
    - Add phone_confirmed_at column to auth.users if not exists
    - Update existing admin user to use phone authentication
*/

-- Add phone_confirmed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'phone_confirmed_at'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN phone_confirmed_at timestamptz;
  END IF;
END $$;

-- Update or create admin user with phone authentication
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- First try to find existing admin user
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE phone = '+972501234567';

  -- If admin doesn't exist, create new one
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      phone,
      phone_confirmed_at,
      encrypted_password,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      '+972501234567',
      now(),
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      '',
      ''
    ) RETURNING id INTO v_user_id;

    -- Insert into public.users if not exists
    INSERT INTO public.users (id, phone, role, name, created_at)
    VALUES (
      v_user_id,
      '+972501234567',
      'admin',
      'מנהל מערכת',
      now()
    )
    ON CONFLICT (phone) DO NOTHING;
  ELSE
    -- Update existing admin user to enable phone authentication
    UPDATE auth.users
    SET 
      phone_confirmed_at = now(),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;
END $$;