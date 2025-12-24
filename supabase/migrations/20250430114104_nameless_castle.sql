/*
  # Fix template stations order constraint
  
  1. Changes
    - Drop existing unique constraint on template_stations table
    - Add new constraint that allows for larger order numbers
*/

-- Drop existing constraint
ALTER TABLE template_stations 
DROP CONSTRAINT IF EXISTS template_stations_template_id_order_key;

-- Create new constraint with bigint type
ALTER TABLE template_stations 
ALTER COLUMN "order" TYPE bigint;

-- Recreate the unique constraint
ALTER TABLE template_stations
ADD CONSTRAINT template_stations_template_id_order_key 
UNIQUE (template_id, "order");

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_template_stations_order 
ON template_stations("order");