-- Storage may be enabled after the earlier production migrations have run.
-- Reconcile the required RoboWorkPool buckets once Storage is available, without
-- granting browser access or loosening their privacy settings.
DO $private_storage_buckets$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      ('training-data-private', 'training-data-private', false, 5368709120,
       ARRAY['video/mp4','video/quicktime','application/octet-stream','application/json']),
      ('manufacturer-documents-private', 'manufacturer-documents-private', false, 104857600,
       ARRAY['application/pdf','application/octet-stream']),
      ('contract-documents-private', 'contract-documents-private', false, 104857600,
       ARRAY['application/pdf','application/octet-stream'])
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END
