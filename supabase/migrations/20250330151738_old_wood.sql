/*
  # Fix device type validation and data migration
  
  1. Changes
    - First insert missing device types into devices table
    - Then update foreign key constraints
    - Drop old enum types
*/

-- First ensure all device types exist in devices table
INSERT INTO devices (name, refill_amount)
VALUES 
  ('מערכת דחסנית', 2000),
  ('Z30', 150),
  ('סאבטלו', 150),
  ('DPM', 100),
  ('דקלין', 150),
  ('אירינג', 500),
  ('מגנט', 150),
  ('טאבלט', 300),
  ('דנקיו', 200),
  ('ארינג', 500),
  ('גמבו', 600)
ON CONFLICT (name) DO UPDATE 
SET refill_amount = EXCLUDED.refill_amount;

-- Drop enum dependencies first
ALTER TABLE service_points 
ALTER COLUMN device_type TYPE text;

ALTER TABLE installation_jobs
ALTER COLUMN device_type TYPE text;

-- Drop the enums
DROP TYPE IF EXISTS device_type CASCADE;
DROP TYPE IF EXISTS new_device_type CASCADE;
DROP TYPE IF EXISTS scent_type CASCADE;

-- Update service_points to reference devices table
ALTER TABLE service_points
ADD CONSTRAINT service_points_device_type_fkey
FOREIGN KEY (device_type) 
REFERENCES devices(name)
ON UPDATE CASCADE;

-- Update installation_jobs to reference devices table
ALTER TABLE installation_jobs
ADD CONSTRAINT installation_jobs_device_type_fkey
FOREIGN KEY (device_type) 
REFERENCES devices(name)
ON UPDATE CASCADE;