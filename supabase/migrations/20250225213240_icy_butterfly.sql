-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON storage.objects;

-- Create storage bucket for job images if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('job-images', 'job-images', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a single policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'job-images')
WITH CHECK (bucket_id = 'job-images');