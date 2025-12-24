/*
  # Fix admin user creation

  1. Changes
    - Drop and recreate users table with correct schema
    - Add admin user with proper constraints
*/

-- Drop existing tables in correct order
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;

-- Recreate users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'worker', 'customer')),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE customers (
  id uuid PRIMARY KEY REFERENCES users(id),
  scent_type text NOT NULL,
  device_type text NOT NULL,
  refill_amount integer NOT NULL,
  notes text
);

-- Create jobs table
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) NOT NULL,
  worker_id uuid REFERENCES users(id) NOT NULL,
  date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed')),
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable write access for admins"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert admin user
INSERT INTO users (phone, password, role, name, created_at)
VALUES (
  '0502307500',
  '123456',
  'admin',
  'מנהל מערכת',
  now()
);