/*
  # Fix service points scent type reference
  
  1. Changes
    - Add scent_type column to service_points table
    - Add foreign key constraint to scents table
    - Insert default scent values
*/

-- First ensure all scent types exist in scents table
INSERT INTO scents (name)
VALUES 
  ('בית מלון'),
  ('רויאל ביץ'),
  ('בלאק יסמין'),
  ('קסטרו'),
  ('בראשית'),
  ('יערות הכרמל'),
  ('גולד'),
  ('אמבר קומבי'),
  ('פרש תה-מלון אופרה'),
  ('פינוק'),
  ('קריד')
ON CONFLICT (name) DO NOTHING;

-- Add scent_type column to service_points if it doesn't exist
ALTER TABLE service_points 
ADD COLUMN IF NOT EXISTS scent_type text;

-- Update service_points to reference scents table
ALTER TABLE service_points
ADD CONSTRAINT service_points_scent_type_fkey
FOREIGN KEY (scent_type) 
REFERENCES scents(name)
ON UPDATE CASCADE;