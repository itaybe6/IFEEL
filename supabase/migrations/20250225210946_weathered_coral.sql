/*
  # Add job service points table

  1. New Tables
    - `job_service_points`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `service_point_id` (uuid, references service_points)
      - `image_url` (text)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Changes
    - Remove `service_point_id` and `image_url` from `jobs` table
    - Add RLS policies for `job_service_points`
*/

-- Create job_service_points table
CREATE TABLE job_service_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  service_point_id uuid REFERENCES service_points(id),
  image_url text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, service_point_id)
);

-- Remove columns from jobs table
ALTER TABLE jobs DROP COLUMN IF EXISTS service_point_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS image_url;

-- Enable RLS
ALTER TABLE job_service_points ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workers can update their assigned job service points"
  ON job_service_points
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_service_points.job_id
      AND jobs.worker_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all job service points"
  ON job_service_points
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX idx_job_service_points_job_id ON job_service_points(job_id);