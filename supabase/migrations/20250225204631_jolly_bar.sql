/*
  # Update scent types and device name

  1. Changes
    - Create scent type enum
    - Add new device types
    - Update service points table to use new types
*/

-- Create scent type enum
DO $$ BEGIN
  CREATE TYPE scent_type AS ENUM (
    'בית מלון',
    'רויאל ביץ',
    'בלאק יסמין',
    'קסטרו',
    'בראשית',
    'יערות הכרמל',
    'גולד',
    'אמבר קומבי',
    'פרש תה-מלון אופרה',
    'פינוק',
    'קריד'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create new device type enum
DO $$ BEGIN
  CREATE TYPE new_device_type AS ENUM (
    'Z30',
    'סאבטלו',
    'DPM',
    'דקלין',
    'אירינג',
    'מגנט',
    'מערכת דחסנית'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add temporary column for new device type
ALTER TABLE service_points 
ADD COLUMN IF NOT EXISTS new_device_type new_device_type;

-- Update the new column with converted values
UPDATE service_points 
SET new_device_type = CASE device_type::text
  WHEN 'מערכת הסנפה' THEN 'מערכת דחסנית'::new_device_type
  ELSE device_type::text::new_device_type
END;

-- Drop old column and rename new column
ALTER TABLE service_points DROP COLUMN device_type;
ALTER TABLE service_points RENAME COLUMN new_device_type TO device_type;

-- Add temporary column for scent type
ALTER TABLE service_points 
ADD COLUMN IF NOT EXISTS new_scent_type scent_type;

-- Update the new column
UPDATE service_points 
SET new_scent_type = scent_type::scent_type;

-- Drop old column and rename new column
ALTER TABLE service_points DROP COLUMN scent_type;
ALTER TABLE service_points RENAME COLUMN new_scent_type TO scent_type;

-- Make columns NOT NULL
ALTER TABLE service_points 
ALTER COLUMN device_type SET NOT NULL,
ALTER COLUMN scent_type SET NOT NULL;