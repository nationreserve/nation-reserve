-- Preserve compatibility for system-generated events that do not require custom metadata.
ALTER TABLE outbox_events
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
