-- Add price column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS price numeric;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_price ON users(price);