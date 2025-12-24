-- Create storage bucket for job images
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-images'
);

-- Create storage policy to allow public access to images
CREATE POLICY "Allow public access to images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'job-images'
);