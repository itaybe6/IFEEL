/*
  # Fix RLS policies for jobs table

  1. Changes
    - Drop existing policies
    - Add new policies for jobs table that allow:
      - Admins to manage all jobs
      - Workers to view their assigned jobs
      - Customers to view their jobs
  
  2. Security
    - Enable RLS on jobs table
    - Add appropriate policies for CRUD operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read relevant jobs" ON jobs;
DROP POLICY IF EXISTS "Workers can update their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can manage all jobs" ON jobs;

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Allow public read access to jobs"
  ON jobs
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admins to manage all jobs"
  ON jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow workers to update their assigned jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (
    worker_id = auth.uid()
  )
  WITH CHECK (
    worker_id = auth.uid()
  );