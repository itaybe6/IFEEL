/*
  # Add Devices and Scents Management Tables

  1. New Tables
    - `devices` - Stores available device types
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)
    
    - `scents` - Stores available scent types
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access
*/

-- Create devices table
CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create scents table
CREATE TABLE scents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE scents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on devices"
  ON devices
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on scents"
  ON scents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default values from existing enums
INSERT INTO devices (name)
SELECT unnest(enum_range(NULL::device_type))
ON CONFLICT (name) DO NOTHING;

INSERT INTO scents (name)
SELECT unnest(enum_range(NULL::scent_type))
ON CONFLICT (name) DO NOTHING;