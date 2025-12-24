-- Create enum for battery types
CREATE TYPE battery_type AS ENUM ('AA', 'DC');

-- Create special jobs table
CREATE TABLE special_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) NOT NULL,
  worker_id uuid REFERENCES users(id) NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('scent_spread', 'plants', 'batteries', 'repairs')),
  date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed')),
  notes text,
  battery_type battery_type,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE special_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on special_jobs"
  ON special_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_special_jobs_customer_id ON special_jobs(customer_id);
CREATE INDEX idx_special_jobs_worker_id ON special_jobs(worker_id);
CREATE INDEX idx_special_jobs_date ON special_jobs(date);
CREATE INDEX idx_special_jobs_status ON special_jobs(status);
CREATE INDEX idx_special_jobs_job_type ON special_jobs(job_type);