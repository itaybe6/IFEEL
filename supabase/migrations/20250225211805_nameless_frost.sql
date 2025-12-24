/*
  # Fix RLS policies for jobs table

  1. Changes
    - Drop existing policies
    - Create new, more permissive policies for admins
  
  2. Security
    - Ensure admins have full access to jobs table
    - Allow workers to view and update their assigned jobs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to jobs" ON jobs;
DROP POLICY IF EXISTS "Allow admins to manage all jobs" ON jobs;
DROP POLICY IF EXISTS "Allow workers to update their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Allow admins to insert jobs" ON jobs;

-- Create new policies
CREATE POLICY "Enable read access for all authenticated users"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable full access for admins"
  ON jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Enable worker updates"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (
    worker_id = auth.uid()
  )
  WITH CHECK (
    worker_id = auth.uid()
  );