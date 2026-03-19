-- 1. Add media JSONB column to instructions
ALTER TABLE instructions ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]';

-- 2. Create media storage bucket (public, 20 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  20971520,
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png',
    'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
CREATE POLICY "media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "media_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "media_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');
