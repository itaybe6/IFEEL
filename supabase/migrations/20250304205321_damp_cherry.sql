-- Create installation_devices table to store multiple devices per job
CREATE TABLE installation_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_job_id uuid REFERENCES installation_jobs(id) ON DELETE CASCADE,
  device_type text NOT NULL,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE installation_devices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on installation_devices"
  ON installation_devices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_installation_devices_job_id ON installation_devices(installation_job_id);