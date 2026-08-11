-- Prompt 009: platform operational control plane.
CREATE OR REPLACE VIEW platform_role_assignments AS
SELECT m.id,m.user_id,m.role,m.status,m.created_at,m.updated_at
FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
WHERE o.organization_type='platform';

CREATE TABLE administrative_step_up_grants(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),session_id uuid NOT NULL REFERENCES auth_sessions(id),
 token_hash text NOT NULL UNIQUE,assurance_level integer NOT NULL DEFAULT 2 CHECK(assurance_level>=2),purpose text NOT NULL,
 expires_at timestamptz NOT NULL,used_at timestamptz,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX admin_step_up_active_idx ON administrative_step_up_grants(user_id,session_id,expires_at) WHERE used_at IS NULL AND revoked_at IS NULL;
CREATE TABLE feature_flags(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),key text NOT NULL,name text NOT NULL,description text NOT NULL,
 status text NOT NULL CHECK(status IN('draft','active','disabled','archived')),enabled boolean NOT NULL DEFAULT false,
 rollout_percentage integer NOT NULL DEFAULT 0 CHECK(rollout_percentage BETWEEN 0 AND 100),
 organization_scope uuid[] NOT NULL DEFAULT '{}',user_scope uuid[] NOT NULL DEFAULT '{}',
 environment text NOT NULL CHECK(environment IN('development','test','production')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),created_by_user_id uuid NOT NULL REFERENCES users(id),
 updated_by_user_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(key,environment));
CREATE TABLE feature_flag_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),feature_flag_id uuid NOT NULL REFERENCES feature_flags(id),
 version integer NOT NULL,enabled boolean NOT NULL,rollout_percentage integer NOT NULL,
 organization_scope uuid[] NOT NULL,user_scope uuid[] NOT NULL,status text NOT NULL,
 changed_by_user_id uuid NOT NULL REFERENCES users(id),change_reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(feature_flag_id,version));

CREATE TABLE platform_configuration(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),key text NOT NULL,category text NOT NULL CHECK(category IN
 ('authentication','heartbeat','contracts','billing','payments','notifications','jobs','workers','maintenance','platform')),
 value jsonb NOT NULL,value_type text NOT NULL CHECK(value_type IN('boolean','integer','number','string','duration_seconds','json')),
 environment text NOT NULL CHECK(environment IN('development','test','production')),description text NOT NULL,
 requires_restart boolean NOT NULL DEFAULT false,editable boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,
 updated_by_user_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(key,environment));
CREATE TABLE platform_configuration_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),configuration_id uuid NOT NULL REFERENCES platform_configuration(id),
 version integer NOT NULL,value jsonb NOT NULL,changed_by_user_id uuid NOT NULL REFERENCES users(id),
 change_reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(configuration_id,version));

CREATE TABLE maintenance_windows(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),scope_type text NOT NULL CHECK(scope_type IN('platform','organization','subsystem')),
 organization_id uuid REFERENCES organizations(id),subsystem text,message text NOT NULL,enabled boolean NOT NULL DEFAULT true,
 starts_at timestamptz NOT NULL,ends_at timestamptz,enabled_by_user_id uuid NOT NULL REFERENCES users(id),
 disabled_by_user_id uuid REFERENCES users(id),disabled_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),CHECK(ends_at IS NULL OR ends_at>starts_at),
 CHECK((scope_type='organization')=(organization_id IS NOT NULL)),CHECK((scope_type='subsystem')=(subsystem IS NOT NULL)));
CREATE UNIQUE INDEX maintenance_active_scope_unique ON maintenance_windows(scope_type,COALESCE(organization_id,'00000000-0000-0000-0000-000000000000'),COALESCE(subsystem,'')) WHERE enabled AND disabled_at IS NULL;

CREATE TABLE system_announcements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,body text NOT NULL,severity text NOT NULL CHECK(severity IN('info','warning','critical')),
 scope_type text NOT NULL CHECK(scope_type IN('global','organization','platform')),organization_id uuid REFERENCES organizations(id),
 starts_at timestamptz NOT NULL,ends_at timestamptz,dismissible boolean NOT NULL DEFAULT true,status text NOT NULL DEFAULT 'scheduled'
 CHECK(status IN('draft','scheduled','active','expired','cancelled')),created_by_user_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at IS NULL OR ends_at>starts_at),CHECK((scope_type='organization')=(organization_id IS NOT NULL)));

CREATE TABLE background_job_definitions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_name text NOT NULL UNIQUE,worker_name text NOT NULL,description text NOT NULL,
 queue_name text NOT NULL,critical boolean NOT NULL DEFAULT false,supports_retry boolean NOT NULL DEFAULT true,
 supports_cancel boolean NOT NULL DEFAULT false,supports_pause boolean NOT NULL DEFAULT true,status text NOT NULL DEFAULT 'active'
 CHECK(status IN('active','paused','disabled')),max_retries integer NOT NULL DEFAULT 3 CHECK(max_retries>=0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE background_job_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_definition_id uuid NOT NULL REFERENCES background_job_definitions(id),
 status text NOT NULL CHECK(status IN('queued','running','succeeded','failed','retrying','cancelled','dead_letter')),
 correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),started_at timestamptz,finished_at timestamptz,duration_ms bigint,
 retry_count integer NOT NULL DEFAULT 0 CHECK(retry_count>=0),failure_code text,failure_message_safe text,
 payload_safe jsonb NOT NULL DEFAULT '{}',result_safe jsonb NOT NULL DEFAULT '{}',available_at timestamptz NOT NULL DEFAULT now(),
 locked_at timestamptz,locked_by text,cancel_requested_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX background_job_queue_idx ON background_job_runs(status,available_at,created_at) WHERE status IN('queued','retrying');
CREATE TABLE worker_heartbeats(
 worker_id text PRIMARY KEY,worker_name text NOT NULL,queue_name text NOT NULL,status text NOT NULL CHECK(status IN('starting','running','draining','stopped','failed')),
 current_job_run_id uuid REFERENCES background_job_runs(id),last_heartbeat_at timestamptz NOT NULL,started_at timestamptz NOT NULL,
 version text NOT NULL,host_safe text,metadata_safe jsonb NOT NULL DEFAULT '{}',updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE operational_incidents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),incident_number text NOT NULL UNIQUE,title text NOT NULL,description text NOT NULL,
 severity text NOT NULL CHECK(severity IN('low','medium','high','critical')),status text NOT NULL CHECK(status IN('open','investigating','resolved','closed')),
 opened_by_user_id uuid NOT NULL REFERENCES users(id),assigned_to_user_id uuid REFERENCES users(id),opened_at timestamptz NOT NULL,
 investigating_at timestamptz,resolved_at timestamptz,closed_at timestamptz,resolution text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE operational_incident_links(
 incident_id uuid NOT NULL REFERENCES operational_incidents(id),entity_type text NOT NULL,entity_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(incident_id,entity_type,entity_id));
CREATE TABLE operational_alerts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),alert_type text NOT NULL,severity text NOT NULL CHECK(severity IN('info','warning','critical')),
 status text NOT NULL CHECK(status IN('open','acknowledged','resolved')),title text NOT NULL,description_safe text NOT NULL,
 resource_type text,resource_id uuid,deduplication_key text NOT NULL UNIQUE,first_observed_at timestamptz NOT NULL,
 last_observed_at timestamptz NOT NULL,occurrence_count integer NOT NULL DEFAULT 1,acknowledged_by_user_id uuid REFERENCES users(id),
 resolved_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE operational_diagnostic_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_type text NOT NULL,severity text NOT NULL CHECK(severity IN('info','warning','error','critical')),
 source text NOT NULL,error_code text,message_safe text NOT NULL,resource_type text,resource_id uuid,correlation_id uuid,
 occurred_at timestamptz NOT NULL,metadata_safe jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX diagnostic_events_recent_idx ON operational_diagnostic_events(occurred_at DESC,severity);

INSERT INTO background_job_definitions(job_name,worker_name,description,queue_name,critical,supports_cancel) VALUES
('heartbeat-processing','heartbeat-worker','Process and validate robot heartbeat messages','heartbeats',true,false),
('financial-finalization','financial-worker','Finalize verified operating time','financial',true,false),
('invoice-generation','billing-worker','Generate company invoices','billing',false,true),
('statement-generation','payroll-worker','Generate owner earnings statements','payroll',false,true),
('settlement-preparation','settlement-worker','Prepare settlement batches','settlement',true,true),
('payment-collection','payment-worker','Submit eligible company collections','payments',true,false),
('payout-submission','payout-worker','Submit approved owner payouts','payouts',true,false),
('webhook-retry','webhook-worker','Retry failed webhook processing','webhooks',true,false),
('reconciliation','reconciliation-worker','Reconcile provider and internal state','reconciliation',true,true),
('cleanup','cleanup-worker','Apply configured retention policies','maintenance',false,true)
ON CONFLICT(job_name) DO NOTHING;