-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to images" ON storage.objects;

-- Create new policies with broader permissions
CREATE POLICY "Enable all operations for authenticated users"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'job-images')
WITH CHECK (bucket_id = 'job-images');

CREATE POLICY "Enable public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'job-images');