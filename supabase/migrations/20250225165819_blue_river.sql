/*
  # Create admin user with phone authentication
  
  1. Changes
    - Add admin user to auth.users table with phone authentication
    - Add admin user to public.users table
    - Handle duplicate user case
*/

DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  -- Check if admin user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE phone = '+972501234567'
  ) THEN
    -- Insert admin user with phone and hashed password
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      phone,
      encrypted_password,
      phone_confirmed_at,
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
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      ''
    ) RETURNING id INTO auth_user_id;

    -- Insert into public.users table if not exists
    IF NOT EXISTS (
      SELECT 1 FROM public.users WHERE phone = '+972501234567'
    ) THEN
      INSERT INTO public.users (id, phone, role, name, created_at)
      VALUES (
        auth_user_id,
        '+972501234567',
        'admin',
        'מנהל מערכת',
        now()
      );
    END IF;
  END IF;
END $$;