/*
  # Add order number to special and installation jobs

  1. Changes
    - Add order_number column to special_jobs and installation_jobs tables
    - Create indexes for better performance
*/

-- Add order_number column to special_jobs table
ALTER TABLE special_jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Add order_number column to installation_jobs table
ALTER TABLE installation_jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Create indexes for better performance
CREATE INDEX idx_special_jobs_order_number ON special_jobs(order_number);
CREATE INDEX idx_installation_jobs_order_number ON installation_jobs(order_number);