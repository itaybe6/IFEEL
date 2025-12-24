/*
  # Initial Schema Setup for Scent Service Management System

  1. Tables
    - users: Stores all user information
    - customers: Extended customer information
    - jobs: Work assignments and history

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
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

-- Policies for users table
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR 
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = 'admin'
        ));

CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for customers table
CREATE POLICY "Customers can read their own data"
  ON customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR 
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = 'admin'
        ));

CREATE POLICY "Admins can manage customer data"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for jobs table
CREATE POLICY "Users can read relevant jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id OR
    auth.uid() = worker_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Workers can update their assigned jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = worker_id
  )
  WITH CHECK (
    auth.uid() = worker_id
  );

CREATE POLICY "Admins can manage all jobs"
  ON jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );