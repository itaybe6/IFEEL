/*
  # Fix cascade deletion for service points

  1. Changes
    - Add ON DELETE CASCADE to job_service_points foreign key constraint
    - This ensures that when a service point is deleted, related job_service_points entries are also deleted

  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- First drop the existing foreign key constraint
ALTER TABLE job_service_points 
DROP CONSTRAINT IF EXISTS job_service_points_service_point_id_fkey;

-- Recreate the constraint with ON DELETE CASCADE
ALTER TABLE job_service_points
ADD CONSTRAINT job_service_points_service_point_id_fkey 
FOREIGN KEY (service_point_id) 
REFERENCES service_points(id) 
ON DELETE CASCADE;