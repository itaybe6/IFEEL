/*
  # Initial schema setup with existence checks

  1. New Tables (if not exist)
    - `users`
      - `id` (uuid, primary key)
      - `phone` (text, unique)
      - `role` (text, enum: admin/worker/customer)
      - `name` (text)
      - `address` (text, optional)
      - `created_at` (timestamptz)
    - `customers`
      - `id` (uuid, references users.id)
      - `scent_type` (text)
      - `device_type` (text)
      - `refill_amount` (integer)
      - `notes` (text, optional)
    - `jobs`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references users.id)
      - `worker_id` (uuid, references users.id)
      - `date` (timestamptz)
      - `status` (text, enum: pending/completed)
      - `image_url` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

DO $$
BEGIN
  -- Create tables if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      phone text UNIQUE NOT NULL,
      role text NOT NULL CHECK (role IN ('admin', 'worker', 'customer')),
      name text NOT NULL,
      address text,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'customers') THEN
    CREATE TABLE customers (
      id uuid PRIMARY KEY REFERENCES users(id),
      scent_type text NOT NULL,
      device_type text NOT NULL,
      refill_amount integer NOT NULL,
      notes text
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'jobs') THEN
    CREATE TABLE jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid REFERENCES users(id) NOT NULL,
      worker_id uuid REFERENCES users(id) NOT NULL,
      date timestamptz NOT NULL,
      status text NOT NULL CHECK (status IN ('pending', 'completed')),
      image_url text,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'users' AND rowsecurity = true
  ) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'customers' AND rowsecurity = true
  ) THEN
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'jobs' AND rowsecurity = true
  ) THEN
    ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Create or replace policies
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
  DROP POLICY IF EXISTS "Enable write access for admins" ON users;
  DROP POLICY IF EXISTS "Customers can read their own data" ON customers;
  DROP POLICY IF EXISTS "Admins can manage customer data" ON customers;
  DROP POLICY IF EXISTS "Users can read relevant jobs" ON jobs;
  DROP POLICY IF EXISTS "Workers can update their assigned jobs" ON jobs;
  DROP POLICY IF EXISTS "Admins can manage all jobs" ON jobs;

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
END $$;