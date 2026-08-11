-- Prompt 020 production workload indexes. Each index maps to a documented query family.
CREATE INDEX IF NOT EXISTS robots_serial_lookup_idx ON robots(manufacturer_id,normalized_serial_number);
CREATE INDEX IF NOT EXISTS robots_model_state_idx ON robots(manufacturer_id,robot_model_id,registration_state,ownership_state);
CREATE INDEX IF NOT EXISTS contracts_company_status_idx ON contracts(hiring_company_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS contracts_manufacturer_status_idx ON contracts(manufacturer_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS contracts_facility_status_idx ON contracts(facility_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS assignments_robot_schedule_idx ON robot_assignments(robot_id,scheduled_start_at,scheduled_end_at);
CREATE INDEX IF NOT EXISTS assignments_contract_status_idx ON robot_assignments(contract_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS facilities_company_status_idx ON facilities(hiring_company_id,status,name);
CREATE INDEX IF NOT EXISTS heartbeat_received_brin_idx ON robot_heartbeat_messages USING brin(received_at) WITH(pages_per_range=64);
CREATE INDEX IF NOT EXISTS heartbeat_assignment_time_idx ON robot_heartbeat_messages(assignment_id,received_at DESC) WHERE assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS heartbeat_manufacturer_time_idx ON robot_heartbeat_messages(manufacturer_id,received_at DESC);
CREATE INDEX IF NOT EXISTS verified_time_contract_period_idx ON verified_operating_intervals(contract_id,interval_start_at,interval_end_at,status);
CREATE INDEX IF NOT EXISTS timeline_occurred_brin_idx ON activity_timeline_entries USING brin(occurred_at) WITH(pages_per_range=64);
CREATE INDEX IF NOT EXISTS timeline_audience_page_idx ON activity_timeline_audiences(organization_id,entry_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id,created_at DESC) WHERE read_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_created_brin_idx ON messages USING brin(created_at) WITH(pages_per_range=64);
CREATE INDEX IF NOT EXISTS messages_conversation_page_idx ON messages(conversation_id,created_at DESC,id DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS background_jobs_queue_health_idx ON background_jobs(job_type,status,available_at,priority);
CREATE INDEX IF NOT EXISTS event_deliveries_health_idx ON event_consumer_deliveries(consumer,status,available_at);

CREATE TABLE saved_searches(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),organization_id uuid NOT NULL REFERENCES organizations(id),name text NOT NULL,search_scope text NOT NULL,query text NOT NULL,filters jsonb NOT NULL DEFAULT '{}',sort jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,organization_id,name));
CREATE INDEX saved_searches_user_idx ON saved_searches(user_id,organization_id,updated_at DESC);
CREATE TRIGGER saved_searches_updated BEFORE UPDATE ON saved_searches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE cache_invalidation_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES outbox_events(id),cache_tag text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','completed','failed')),attempts integer NOT NULL DEFAULT 0,last_error text,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,UNIQUE(event_id,cache_tag));
CREATE INDEX cache_invalidation_pending_idx ON cache_invalidation_events(status,created_at);

CREATE TABLE backup_verification_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),backup_identifier text NOT NULL UNIQUE,backup_type text NOT NULL CHECK(backup_type IN('full','incremental','point_in_time','object_storage')),started_at timestamptz NOT NULL,completed_at timestamptz,status text NOT NULL CHECK(status IN('running','verified','failed')),restore_target text NOT NULL,checksum_verified boolean,restore_verified boolean,last_recovery_point timestamptz,evidence_location text,failure_summary text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE disaster_recovery_exercises(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),scenario text NOT NULL,started_at timestamptz NOT NULL,completed_at timestamptz,status text NOT NULL CHECK(status IN('planned','running','passed','failed','waived')),rpo_seconds integer CHECK(rpo_seconds>=0),rto_seconds integer CHECK(rto_seconds>=0),actual_data_loss_seconds integer CHECK(actual_data_loss_seconds>=0),actual_recovery_seconds integer CHECK(actual_recovery_seconds>=0),evidence_location text,findings jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now());

CREATE VIEW queue_health AS SELECT job_type queue_name,count(*) FILTER(WHERE status IN('queued','failed')) depth,count(*) FILTER(WHERE status='dead_letter') dead_letters,min(created_at) FILTER(WHERE status IN('queued','failed')) oldest_waiting_at,max(attempts) FILTER(WHERE status IN('queued','failed')) max_attempts_seen FROM background_jobs GROUP BY job_type;

CREATE OR REPLACE FUNCTION enqueue_cache_invalidation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org_id text;
BEGIN
 org_id:=coalesce(NEW.payload->>'organizationId',NEW.payload->>'organization_id',NEW.metadata->>'organizationId');
 INSERT INTO cache_invalidation_events(event_id,cache_tag) VALUES(NEW.id,'domain:'||NEW.aggregate_type),(NEW.id,'resource:'||NEW.aggregate_type||':'||NEW.aggregate_id::text) ON CONFLICT DO NOTHING;
 IF org_id IS NOT NULL THEN INSERT INTO cache_invalidation_events(event_id,cache_tag) VALUES(NEW.id,'organization:'||org_id),(NEW.id,'dashboard:'||org_id),(NEW.id,'search:'||org_id) ON CONFLICT DO NOTHING;END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER outbox_enqueue_cache_invalidation AFTER INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION enqueue_cache_invalidation();

CREATE OR REPLACE FUNCTION prompt020_operational_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,metadata,occurred_at) VALUES(gen_random_uuid(),TG_ARGV[0],TG_ARGV[1],NEW.id,jsonb_build_object('status',NEW.status),jsonb_build_object('schemaVersion',1,'timeline',jsonb_build_object('organizationIds','[]'::jsonb,'category',TG_ARGV[2],'source','background_worker','summary',TG_ARGV[3],'status',NEW.status)),now());RETURN NEW;END $$;
CREATE TRIGGER backup_verification_timeline AFTER INSERT ON backup_verification_runs FOR EACH ROW EXECUTE FUNCTION prompt020_operational_event('backup.verification.started','backup_verification','migration','Backup verification started');
CREATE TRIGGER disaster_recovery_timeline AFTER INSERT ON disaster_recovery_exercises FOR EACH ROW EXECUTE FUNCTION prompt020_operational_event('disaster_recovery.exercise.started','disaster_recovery_exercise','incident','Disaster recovery exercise started');
