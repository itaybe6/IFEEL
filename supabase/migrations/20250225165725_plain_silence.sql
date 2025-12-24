/*
  # Remove email requirement

  1. Changes
    - Remove email requirement from auth.users
    - Update existing policies
*/

-- Update auth.users to not require email
ALTER TABLE auth.users 
  ALTER COLUMN email DROP NOT NULL;