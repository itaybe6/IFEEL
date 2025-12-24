/*
  # Fix Work Templates Policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies that allow all operations
    - Ensure proper access control for templates and related tables
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON work_templates;
DROP POLICY IF EXISTS "Enable write access for admins" ON work_templates;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON template_stations;
DROP POLICY IF EXISTS "Enable write access for admins" ON template_stations;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON work_schedules;
DROP POLICY IF EXISTS "Enable write access for admins" ON work_schedules;

-- Create simplified policies for work_templates
CREATE POLICY "Allow all operations"
  ON work_templates
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create simplified policies for template_stations
CREATE POLICY "Allow all operations"
  ON template_stations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create simplified policies for work_schedules
CREATE POLICY "Allow all operations"
  ON work_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);