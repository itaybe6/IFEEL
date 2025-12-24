/*
  # Add One-Time Customers Support
  
  1. Changes
    - Add one_time_customer table for storing temporary customer information
    - Add foreign key constraints and indexes
    - Enable RLS and add policies
*/

-- Create one_time_customer table
CREATE TABLE one_time_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE one_time_customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for authenticated users"
  ON one_time_customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_one_time_customers_name ON one_time_customers(name);
CREATE INDEX idx_one_time_customers_created_at ON one_time_customers(created_at);

-- Modify jobs table to allow null customer_id
ALTER TABLE jobs ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE jobs ADD COLUMN one_time_customer_id uuid REFERENCES one_time_customers(id);

-- Modify installation_jobs table to allow null customer_id
ALTER TABLE installation_jobs ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE installation_jobs ADD COLUMN one_time_customer_id uuid REFERENCES one_time_customers(id);

-- Modify special_jobs table to allow null customer_id
ALTER TABLE special_jobs ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE special_jobs ADD COLUMN one_time_customer_id uuid REFERENCES one_time_customers(id);

-- Add constraints to ensure either customer_id or one_time_customer_id is set
ALTER TABLE jobs 
  ADD CONSTRAINT jobs_customer_check 
  CHECK (
    (customer_id IS NOT NULL AND one_time_customer_id IS NULL) OR 
    (customer_id IS NULL AND one_time_customer_id IS NOT NULL)
  );

ALTER TABLE installation_jobs 
  ADD CONSTRAINT installation_jobs_customer_check 
  CHECK (
    (customer_id IS NOT NULL AND one_time_customer_id IS NULL) OR 
    (customer_id IS NULL AND one_time_customer_id IS NOT NULL)
  );

ALTER TABLE special_jobs 
  ADD CONSTRAINT special_jobs_customer_check 
  CHECK (
    (customer_id IS NOT NULL AND one_time_customer_id IS NULL) OR 
    (customer_id IS NULL AND one_time_customer_id IS NOT NULL)
  );