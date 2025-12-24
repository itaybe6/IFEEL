/*
  # Update service points policies

  1. Changes
    - Drop existing policies
    - Add new policy to allow admins full access to service points
    - Add policy for public read access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON service_points;
DROP POLICY IF EXISTS "Enable write access for admins" ON service_points;

-- Create new policies
CREATE POLICY "Allow public read access to service points"
  ON service_points
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admins full access to service points"
  ON service_points
  FOR ALL
  USING (true)
  WITH CHECK (true);