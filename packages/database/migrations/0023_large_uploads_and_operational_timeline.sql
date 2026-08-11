CREATE TABLE multipart_uploads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),object_id uuid NOT NULL REFERENCES stored_objects(id),provider_upload_id text NOT NULL UNIQUE,part_size_bytes integer NOT NULL CHECK(part_size_bytes>=5242880),expected_parts integer CHECK(expected_parts>0),completed_parts jsonb NOT NULL DEFAULT '[]',status text NOT NULL DEFAULT 'initiated' CHECK(status IN('initiated','uploading','completing','completed','aborted','expired','failed')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz);
CREATE INDEX multipart_upload_expiry_idx ON multipart_uploads(status,expires_at);
CREATE TRIGGER multipart_uploads_updated BEFORE UPDATE ON multipart_uploads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION prompt020_operational_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE audiences jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(id::text),'[]'::jsonb) INTO audiences FROM organizations WHERE organization_type='platform' AND status='active';
 INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,metadata,occurred_at) VALUES(gen_random_uuid(),TG_ARGV[0],TG_ARGV[1],NEW.id,jsonb_build_object('status',NEW.status),jsonb_build_object('schemaVersion',1,'timeline',jsonb_build_object('organizationIds',audiences,'category',TG_ARGV[2],'source','background_worker','summary',TG_ARGV[3],'status',NEW.status)),now());RETURN NEW;
END $$;
