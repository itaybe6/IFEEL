-- Create installation_jobs table
CREATE TABLE IF NOT EXISTS installation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) NOT NULL,
  worker_id uuid REFERENCES users(id) NOT NULL,
  device_type text NOT NULL,
  date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE installation_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for installation_jobs
CREATE POLICY "Allow all operations on installation_jobs"
  ON installation_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_installation_jobs_customer_id ON installation_jobs(customer_id);
CREATE INDEX idx_installation_jobs_worker_id ON installation_jobs(worker_id);
CREATE INDEX idx_installation_jobs_date ON installation_jobs(date);
CREATE INDEX idx_installation_jobs_status ON installation_jobs(status);