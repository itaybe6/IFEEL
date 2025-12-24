-- Add refill_amount column to devices table
ALTER TABLE devices 
ADD COLUMN refill_amount integer NOT NULL DEFAULT 0;

-- Update existing devices with their default refill amounts
UPDATE devices 
SET refill_amount = CASE name
  WHEN 'Z30' THEN 150
  WHEN 'טאבלט' THEN 300
  WHEN 'DPM' THEN 100
  WHEN 'דנקיו' THEN 200
  WHEN 'ארינג' THEN 500
  WHEN 'גמבו' THEN 600
  WHEN 'מערכת דחסנית' THEN 2000
  ELSE 0
END;