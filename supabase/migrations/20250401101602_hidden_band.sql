-- Add order_number column to all job-related tables if they don't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

ALTER TABLE special_jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

ALTER TABLE installation_jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Create or replace indexes for better performance
DROP INDEX IF EXISTS idx_jobs_order_number;
DROP INDEX IF EXISTS idx_special_jobs_order_number;
DROP INDEX IF EXISTS idx_installation_jobs_order_number;

CREATE INDEX idx_jobs_order_number ON jobs(order_number);
CREATE INDEX idx_special_jobs_order_number ON special_jobs(order_number);
CREATE INDEX idx_installation_jobs_order_number ON installation_jobs(order_number);