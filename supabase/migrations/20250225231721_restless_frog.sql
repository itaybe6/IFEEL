-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies from work_templates
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON work_templates;
  DROP POLICY IF EXISTS "Enable write access for admins" ON work_templates;
  DROP POLICY IF EXISTS "Allow all operations" ON work_templates;

  -- Drop policies from template_stations
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON template_stations;
  DROP POLICY IF EXISTS "Enable write access for admins" ON template_stations;
  DROP POLICY IF EXISTS "Allow all operations" ON template_stations;

  -- Drop policies from work_schedules
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON work_schedules;
  DROP POLICY IF EXISTS "Enable write access for admins" ON work_schedules;
  DROP POLICY IF EXISTS "Allow all operations" ON work_schedules;

  -- Create new policies with unique names
  EXECUTE 'CREATE POLICY "Allow all operations on work_templates"
    ON work_templates
    FOR ALL 
    USING (true)
    WITH CHECK (true)';

  EXECUTE 'CREATE POLICY "Allow all operations on template_stations"
    ON template_stations
    FOR ALL
    USING (true)
    WITH CHECK (true)';

  EXECUTE 'CREATE POLICY "Allow all operations on work_schedules"
    ON work_schedules
    FOR ALL
    USING (true)
    WITH CHECK (true)';
EXCEPTION
  WHEN others THEN
    NULL;
END $$;