-- Add order_number column to special_jobs table
ALTER TABLE special_jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Add order_number column to installation_jobs table
ALTER TABLE installation_jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_special_jobs_order_number ON special_jobs(order_number);
CREATE INDEX IF NOT EXISTS idx_installation_jobs_order_number ON installation_jobs(order_number);

-- Add order_number column to jobs table if it doesn't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Create index for jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_order_number ON jobs(order_number);