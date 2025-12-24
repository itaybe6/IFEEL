-- Drop existing policies
DROP POLICY IF EXISTS "Customers can view their own service points" ON service_points;
DROP POLICY IF EXISTS "Workers can view assigned service points" ON service_points;
DROP POLICY IF EXISTS "Admins can manage service points" ON service_points;

-- Create new policies for service points
CREATE POLICY "Enable read access for authenticated users"
  ON service_points
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable write access for admins"
  ON service_points
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );