/*
  # Add notes column to jobs table

  1. Changes
    - Add notes column to jobs table for storing optional job notes
    - Column type is text and nullable
*/

-- Add notes column to jobs table if it doesn't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS notes text;