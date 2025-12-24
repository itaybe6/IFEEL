-- Add custom_refill_amount column to job_service_points table
ALTER TABLE job_service_points 
ADD COLUMN IF NOT EXISTS custom_refill_amount integer;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_job_service_points_custom_refill ON job_service_points(custom_refill_amount);