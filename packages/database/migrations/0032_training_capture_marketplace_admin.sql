ALTER TYPE training_project_status ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE training_project_status ADD VALUE IF NOT EXISTS 'ENDED';
ALTER TYPE training_project_status ADD VALUE IF NOT EXISTS 'SUBMITTED';

CREATE TABLE training_session_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES training_sessions(id),event_type text NOT NULL CHECK(event_type IN('PAUSED','RESUMED','ENDED','SUBMITTED','PRIVACY_ISSUE','BYSTANDER_INCIDENT','SENSITIVE_CONTENT','DELETION_REQUESTED')),actor_user_id uuid NOT NULL REFERENCES users(id),metadata jsonb NOT NULL DEFAULT '{}',occurred_at timestamptz NOT NULL DEFAULT now(),idempotency_key text NOT NULL UNIQUE);
CREATE TRIGGER training_session_events_immutable BEFORE UPDATE OR DELETE ON training_session_events FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TABLE training_privacy_incidents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES training_sessions(id),reported_by_user_id uuid NOT NULL REFERENCES users(id),incident_type text NOT NULL CHECK(incident_type IN('PRIVACY_ISSUE','BYSTANDER_INCIDENT','SENSITIVE_CONTENT','UNAUTHORIZED_LOCATION','CONSENT_WITHDRAWAL','DELETION_REQUEST')),description text NOT NULL,status text NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','UNDER_REVIEW','RESTRICTED','RESOLVED','DELETION_COMPLETED','DELETION_DENIED')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS pause_started_at timestamptz;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS accumulated_paused_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS content_restricted_at timestamptz;

CREATE TABLE wearable_project_compatibility(product_id uuid NOT NULL REFERENCES wearable_catalog_products(id),project_id uuid NOT NULL REFERENCES training_projects(id),status text NOT NULL CHECK(status IN('ACCEPTABLE','REQUIRED','PROHIBITED','REVIEW_REQUIRED')),notes text,reviewed_by_user_id uuid REFERENCES users(id),reviewed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(product_id,project_id));
CREATE TABLE marketplace_broken_link_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid NOT NULL REFERENCES wearable_catalog_products(id),reported_by_user_id uuid REFERENCES users(id),url text NOT NULL,reason text,status text NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','CONFIRMED','RESOLVED','DISMISSED')),created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz);
