/*
  # Add price field to users table
  
  1. New Fields
    - Add `price` column to the `users` table for storing customer pricing
  
  2. Changes
    - Adds a nullable numeric price field to the users table
*/

-- Add price column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS price numeric;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_price ON users(price);