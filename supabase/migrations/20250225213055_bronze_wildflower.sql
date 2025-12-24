-- Drop existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable public read access" ON storage.objects;

-- Create storage bucket for job images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create new storage policies with proper permissions
CREATE POLICY "Enable read access for all users"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'job-images');

CREATE POLICY "Enable insert access for authenticated users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-images');

CREATE POLICY "Enable update access for authenticated users"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-images')
WITH CHECK (bucket_id = 'job-images');

CREATE POLICY "Enable delete access for authenticated users"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-images');