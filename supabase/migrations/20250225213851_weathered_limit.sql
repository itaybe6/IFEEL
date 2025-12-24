/*
  # Work Templates Management Schema

  1. New Tables
    - `work_templates`
      - `id` (uuid, primary key)
      - `name` (text, template name)
      - `created_at` (timestamp)
    
    - `template_stations`
      - `id` (uuid, primary key)
      - `template_id` (uuid, references work_templates)
      - `customer_id` (uuid, references users)
      - `worker_id` (uuid, references users)
      - `order` (integer, station order in template)
      - `created_at` (timestamp)

    - `work_schedules`
      - `id` (uuid, primary key)
      - `template_id` (uuid, references work_templates)
      - `date` (date, scheduled date)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create work_templates table
CREATE TABLE work_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create template_stations table
CREATE TABLE template_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES work_templates(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES users(id),
  worker_id uuid REFERENCES users(id),
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, "order")
);

-- Create work_schedules table
CREATE TABLE work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES work_templates(id),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS
ALTER TABLE work_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for work_templates
CREATE POLICY "Allow all operations for admins on work_templates"
  ON work_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for template_stations
CREATE POLICY "Allow all operations for admins on template_stations"
  ON template_stations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for work_schedules
CREATE POLICY "Allow all operations for admins on work_schedules"
  ON work_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_template_stations_template_id ON template_stations(template_id);
CREATE INDEX idx_work_schedules_date ON work_schedules(date);