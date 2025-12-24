/*
  # Support Tickets System

  1. New Tables
    - `support_tickets` - Stores customer support requests
      - `id` (uuid, primary key)
      - `customer_name` (text, not null)
      - `phone` (text, not null)
      - `description` (text, not null)
      - `is_new` (boolean, default true)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `support_tickets` table
    - Add policy for public access to support tickets
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  description text NOT NULL,
  is_new boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for support_tickets
CREATE POLICY "Allow all operations on support_tickets"
  ON support_tickets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_is_new ON support_tickets(is_new);