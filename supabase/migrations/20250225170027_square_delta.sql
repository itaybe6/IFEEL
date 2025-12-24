/*
  # Fix database tables and policies
  
  1. Changes
    - Add IF NOT EXISTS checks for all table creations
    - Drop and recreate policies to ensure they are up to date
    - Update RLS settings
*/

DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
  DROP POLICY IF EXISTS "Enable write access for admins" ON users;
  DROP POLICY IF EXISTS "Customers can read their own data" ON customers;
  DROP POLICY IF EXISTS "Admins can manage customer data" ON customers;
  DROP POLICY IF EXISTS "Users can read relevant jobs" ON jobs;
  DROP POLICY IF EXISTS "Workers can update their assigned jobs" ON jobs;
  DROP POLICY IF EXISTS "Admins can manage all jobs" ON jobs;

  -- Enable RLS
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

  -- Recreate policies
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