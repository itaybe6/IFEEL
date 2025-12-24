/*
  # Add job order number functionality

  1. New Columns
    - `order_number` (integer) - Stores the daily order number for each worker's jobs
    
  2. Changes
    - Add order_number column to jobs table
    - Create index for better performance
*/

-- Add order_number column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Create index for better performance
CREATE INDEX idx_jobs_order_number ON jobs(order_number);