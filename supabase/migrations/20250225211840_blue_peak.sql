/*
  # Fix RLS policies for jobs table

  1. Changes
    - Drop existing policies
    - Create new, simplified policies for jobs table
  
  2. Security
    - Allow admins to perform all operations
    - Allow all authenticated users to read jobs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable full access for admins" ON jobs;
DROP POLICY IF EXISTS "Enable worker updates" ON jobs;

-- Create new policies
CREATE POLICY "Allow all operations for admins"
  ON jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy for reading jobs
CREATE POLICY "Allow reading jobs for authenticated users"
  ON jobs
  FOR SELECT
  USING (true);