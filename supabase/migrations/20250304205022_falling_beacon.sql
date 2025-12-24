-- Add image_url column to installation_jobs
ALTER TABLE installation_jobs
ADD COLUMN image_url text;

-- Add image_url column to special_jobs
ALTER TABLE special_jobs
ADD COLUMN image_url text;

-- Create indexes for better performance
CREATE INDEX idx_installation_jobs_image_url ON installation_jobs(image_url);
CREATE INDEX idx_special_jobs_image_url ON special_jobs(image_url);