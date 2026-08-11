-- Canonical Appendix O supersedes earlier timeline drafts.
ALTER TABLE activity_timeline_entries DROP CONSTRAINT activity_timeline_entries_category_check;
ALTER TABLE activity_timeline_entries ADD CONSTRAINT activity_timeline_entries_category_check CHECK(category IN(
 'organization','robot','ownership','manufacturer','hiring_company','robot_owner','training','training_equipment','training_session','training_package','work_order','opportunity','messaging','contract','assignment','scheduling','heartbeat','verified_operating_time','financial','invoice','payment','statement','payout','support','dispute','incident','notification','administration','deployment','release','migration','acceptance','operations','security','permissions','company','owner','system'));
ALTER TABLE activity_timeline_entries DROP CONSTRAINT activity_timeline_entries_source_check;
ALTER TABLE activity_timeline_entries ADD CONSTRAINT activity_timeline_entries_source_check CHECK(source IN(
 'user_action','user_interaction','system_automation','automated_workflow','api_integration','manufacturer_integration','heartbeat_validation','robot_heartbeat_api','background_job','background_worker','administrator_action','platform_administration','financial_provider','notification_engine','release_automation','deployment_system','acceptance_validation','acceptance_system','system_process'));
ALTER TABLE activity_timeline_entries
 ADD COLUMN actor_organization_id uuid REFERENCES organizations(id),
 ADD COLUMN actor_role text,
 ADD COLUMN previous_status text,
 ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN source_system text,
 ADD COLUMN correlation_id uuid,
 ADD COLUMN archived_at timestamptz;
CREATE INDEX activity_timeline_actor_idx ON activity_timeline_entries(actor_user_id,occurred_at DESC);
CREATE INDEX activity_timeline_correlation_idx ON activity_timeline_entries(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX activity_timeline_archived_idx ON activity_timeline_entries(occurred_at DESC) WHERE archived_at IS NOT NULL;

CREATE TABLE timeline_compliance_exceptions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),subject_type text NOT NULL,subject_key text NOT NULL,reason text NOT NULL,
 approved_by_user_id uuid NOT NULL REFERENCES users(id),approved_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz,
 status text NOT NULL DEFAULT 'approved' CHECK(status IN('approved','expired','revoked')),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(subject_type,subject_key,status));
CREATE TRIGGER timeline_compliance_exceptions_append_only BEFORE UPDATE OR DELETE ON timeline_compliance_exceptions FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE OR REPLACE FUNCTION timeline_category(event_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT CASE
 WHEN event_name ILIKE '%training%equipment%' THEN 'training_equipment' WHEN event_name ILIKE '%training%session%' THEN 'training_session' WHEN event_name ILIKE '%training%package%' THEN 'training_package'
 WHEN event_name ILIKE '%heartbeat%' OR event_name ILIKE '%offline%' THEN 'heartbeat' WHEN event_name ILIKE '%verified%time%' OR event_name ILIKE '%operating%interval%' THEN 'verified_operating_time'
 WHEN event_name ILIKE '%invoice%' THEN 'invoice' WHEN event_name ILIKE '%payout%' THEN 'payout' WHEN event_name ILIKE '%statement%' THEN 'statement' WHEN event_name ILIKE '%payment%' OR event_name ILIKE '%refund%' OR event_name ILIKE '%chargeback%' THEN 'payment'
 WHEN event_name ILIKE '%work%order%' THEN 'work_order' WHEN event_name ILIKE '%opportunity%' OR event_name ILIKE '%interest%' THEN 'opportunity' WHEN event_name ILIKE '%assignment%' OR event_name ILIKE '%allocated%' THEN 'assignment' WHEN event_name ILIKE '%schedule%' THEN 'scheduling' WHEN event_name ILIKE '%contract%' THEN 'contract'
 WHEN event_name ILIKE '%ownership%' THEN 'ownership' WHEN event_name ILIKE '%robot%' THEN 'robot' WHEN event_name ILIKE '%manufacturer%' THEN 'manufacturer' WHEN event_name ILIKE '%message%' OR event_name ILIKE '%conversation%' THEN 'messaging'
 WHEN event_name ILIKE '%support%' OR event_name ILIKE '%ticket%' THEN 'support' WHEN event_name ILIKE '%dispute%' THEN 'dispute' WHEN event_name ILIKE '%incident%' THEN 'incident'
 WHEN event_name ILIKE '%release%' THEN 'release' WHEN event_name ILIKE '%deploy%' THEN 'deployment' WHEN event_name ILIKE '%migration%' OR event_name ILIKE '%restore%' THEN 'migration' WHEN event_name ILIKE '%acceptance%' OR event_name ILIKE '%waiver%' THEN 'acceptance'
 WHEN event_name ILIKE '%permission%' OR event_name ILIKE '%role%' THEN 'permissions' WHEN event_name ILIKE '%auth%' OR event_name ILIKE '%security%' THEN 'security' WHEN event_name ILIKE '%organization%' OR event_name ILIKE '%member%' THEN 'organization'
 ELSE 'system' END $$;
