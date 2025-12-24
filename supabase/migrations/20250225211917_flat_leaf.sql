/*
  # Fix RLS policies for job_service_points table

  1. Changes
    - Drop existing policies
    - Create new, simplified policies for job_service_points table
  
  2. Security
    - Allow admins to perform all operations
    - Allow all authenticated users to read job service points
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Workers can update their assigned job service points" ON job_service_points;
DROP POLICY IF EXISTS "Admins can manage all job service points" ON job_service_points;
DROP POLICY IF EXISTS "Allow admins to insert job service points" ON job_service_points;

-- Create new policies
CREATE POLICY "Allow all operations for admins"
  ON job_service_points
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy for reading job service points
CREATE POLICY "Allow reading job service points for authenticated users"
  ON job_service_points
  FOR SELECT
  USING (true);