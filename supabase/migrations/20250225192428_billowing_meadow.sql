/*
  # Add password column to users table

  1. Changes
    - Add password column to users table
    - Make password column required
    - Add default password for existing users

  2. Security
    - Password is stored as plain text for simplicity
    - In production, passwords should be hashed
*/

ALTER TABLE users 
ADD COLUMN password text NOT NULL DEFAULT '123456';

-- Remove the default constraint after setting initial passwords
ALTER TABLE users 
ALTER COLUMN password DROP DEFAULT;