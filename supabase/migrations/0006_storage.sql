-- Private plate-photo storage (TASK-042, PRD § Security: private bucket,
-- signed URLs, users touch only their own folder <user_id>/...).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('plate-photos', 'plate-photos', FALSE, 4194304, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Users manage files only inside their own top-level folder.
CREATE POLICY "plate_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plate-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "plate_photos_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'plate-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "plate_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'plate-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
