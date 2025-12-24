/*
  # Add service points support

  1. New Tables
    - `service_points`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references users.id)
      - `scent_type` (text)
      - `device_type` (text)
      - `refill_amount` (integer)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Update jobs table to reference service points
    - Add device type enum
    - Add RLS policies for service points table

  3. Security
    - Enable RLS on service points table
    - Add policies for admins and customers
*/

-- Create device type enum
CREATE TYPE device_type AS ENUM (
  'Z30',
  'סאבטלו',
  'DPM',
  'דקלין',
  'אירינג',
  'מגנט',
  'מערכת הסנפה'
);

-- Create service points table
CREATE TABLE service_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) NOT NULL,
  scent_type text NOT NULL,
  device_type device_type NOT NULL,
  refill_amount integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add service point reference to jobs table
ALTER TABLE jobs 
ADD COLUMN service_point_id uuid REFERENCES service_points(id);

-- Enable RLS
ALTER TABLE service_points ENABLE ROW LEVEL SECURITY;

-- Create policies for service points
CREATE POLICY "Customers can view their own service points"
  ON service_points
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Workers can view assigned service points"
  ON service_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.service_point_id = service_points.id
      AND jobs.worker_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage service points"
  ON service_points
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX idx_service_points_customer_id ON service_points(customer_id);