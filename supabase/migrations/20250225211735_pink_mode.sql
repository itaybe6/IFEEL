/*
  # Fix RLS policies for jobs table

  1. Changes
    - Add new policy to allow admins to insert new jobs
  
  2. Security
    - Ensure admins can create new jobs
*/

-- Create policy for inserting new jobs
CREATE POLICY "Allow admins to insert jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policy for inserting job service points
CREATE POLICY "Allow admins to insert job service points"
  ON job_service_points
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );