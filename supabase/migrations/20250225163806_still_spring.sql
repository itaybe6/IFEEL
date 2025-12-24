/*
  # Fix RLS policies for users table
  
  1. Changes
    - Drop existing policies that might cause recursion
    - Create new, simplified policies for users table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create new policies
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
    role = 'admin'
  )
  WITH CHECK (
    role = 'admin'
  );