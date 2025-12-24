/*
  # Fix Work Templates RLS Policies

  1. Changes
    - Drop existing restrictive policies
    - Create new policies allowing admin operations
    - Enable public read access for authenticated users
    
  2. Security
    - Maintain admin-only write access
    - Allow read access for all authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for admins on work_templates" ON work_templates;
DROP POLICY IF EXISTS "Allow all operations for admins on template_stations" ON template_stations;
DROP POLICY IF EXISTS "Allow all operations for admins on work_schedules" ON work_schedules;

-- Create new policies for work_templates
CREATE POLICY "Enable read access for authenticated users"
  ON work_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable write access for admins"
  ON work_templates
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

-- Create new policies for template_stations
CREATE POLICY "Enable read access for authenticated users"
  ON template_stations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable write access for admins"
  ON template_stations
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

-- Create new policies for work_schedules
CREATE POLICY "Enable read access for authenticated users"
  ON work_schedules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable write access for admins"
  ON work_schedules
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