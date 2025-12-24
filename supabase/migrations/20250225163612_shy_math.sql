-- Insert admin user with phone and hashed password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
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
  NULL,
  crypt('admin123', gen_salt('bf')),
  now(),
  '+972501234567',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Get the user id from the auth.users table
DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  SELECT id INTO auth_user_id FROM auth.users WHERE phone = '+972501234567';
  
  -- Insert into public.users table
  INSERT INTO public.users (id, phone, role, name, created_at)
  VALUES (
    auth_user_id,
    '+972501234567',
    'admin',
    'System Admin',
    now()
  );
END $$;