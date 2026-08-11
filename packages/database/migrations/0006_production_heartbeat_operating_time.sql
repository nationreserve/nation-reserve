CREATE TABLE robot_production_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  hardware_identity_id uuid NOT NULL REFERENCES robot_hardware_identities(id),
  credential_type text NOT NULL CHECK(credential_type IN ('hmac_secret','public_key_signature','device_certificate')),
  credential_prefix text NOT NULL UNIQUE,
  encrypted_secret text,
  public_key text,
  certificate_fingerprint text,
  status text NOT NULL CHECK(status IN ('pending','active','rotating','revoked','expired','compromised')),
  valid_from timestamptz NOT NULL,
  expires_at timestamptz,
  last_used_at timestamptz,
  rotated_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_by_user_id uuid REFERENCES users(id),
  created_by_credential_id uuid REFERENCES manufacturer_api_credentials(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(expires_at IS NULL OR expires_at>valid_from),
  CHECK((credential_type='hmac_secret' AND encrypted_secret IS NOT NULL AND public_key IS NULL) OR
        (credential_type='public_key_signature' AND public_key IS NOT NULL AND encrypted_secret IS NULL) OR
        (credential_type='device_certificate' AND certificate_fingerprint IS NOT NULL AND encrypted_secret IS NULL))
);
CREATE UNIQUE INDEX robot_production_credentials_active_unique
  ON robot_production_credentials(robot_id) WHERE status='active';

CREATE TABLE robot_heartbeat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  robot_id uuid NOT NULL REFERENCES robots(id),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  assignment_id uuid REFERENCES robot_assignments(id),
  contract_id uuid REFERENCES contracts(id),
  credential_id uuid NOT NULL REFERENCES robot_production_credentials(id),
  schema_version integer NOT NULL CHECK(schema_version>0),
  sequence_number bigint NOT NULL CHECK(sequence_number>=0),
  nonce_hash text NOT NULL,
  sent_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  manufacturer_state text NOT NULL,
  mapped_operational_state text NOT NULL,
  network_status text NOT NULL,
  firmware_version text NOT NULL,
  api_version text NOT NULL,
  signature_algorithm text NOT NULL,
  signature_validation_result text NOT NULL,
  identity_validation_result text NOT NULL,
  assignment_correlation_result text NOT NULL,
  schedule_correlation_result text NOT NULL,
  lifecycle_eligibility_result text NOT NULL,
  operating_time_decision text NOT NULL,
  validation_status text NOT NULL CHECK(validation_status IN
    ('accepted','accepted_not_eligible','duplicate','rejected','held_for_review')),
  failure_codes jsonb NOT NULL DEFAULT '[]',
  payload_hash text NOT NULL,
  source_ip inet,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(credential_id,message_id),
  UNIQUE(credential_id,nonce_hash)
);
CREATE INDEX heartbeat_messages_robot_time_idx ON robot_heartbeat_messages(robot_id,received_at DESC);

CREATE OR REPLACE FUNCTION reject_heartbeat_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'heartbeat evidence is append-only'; END; $$;
CREATE TRIGGER robot_heartbeat_messages_append_only BEFORE UPDATE OR DELETE ON robot_heartbeat_messages
FOR EACH ROW EXECUTE FUNCTION reject_heartbeat_evidence_mutation();

CREATE TABLE robot_heartbeat_sequence_state (
  robot_id uuid NOT NULL REFERENCES robots(id),
  credential_id uuid NOT NULL REFERENCES robot_production_credentials(id),
  highest_sequence_number bigint NOT NULL CHECK(highest_sequence_number>=0),
  lowest_acceptable_sequence_number bigint NOT NULL CHECK(lowest_acceptable_sequence_number>=0),
  last_message_id uuid,
  last_sent_at timestamptz,
  last_received_at timestamptz,
  state_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(robot_id,credential_id),
  CHECK(lowest_acceptable_sequence_number<=highest_sequence_number)
);

CREATE TABLE robot_heartbeat_status (
  robot_id uuid PRIMARY KEY REFERENCES robots(id),
  heartbeat_state text NOT NULL CHECK(heartbeat_state IN
    ('never_connected','connecting','online','degraded','offline','invalid','credential_restricted')),
  last_valid_message_id uuid,
  last_valid_sent_at timestamptz,
  last_valid_received_at timestamptz,
  last_mapped_operational_state text,
  last_assignment_id uuid REFERENCES robot_assignments(id),
  next_expected_at timestamptz,
  offline_after_at timestamptz,
  consecutive_invalid_count integer NOT NULL DEFAULT 0 CHECK(consecutive_invalid_count>=0),
  consecutive_missed_count integer NOT NULL DEFAULT 0 CHECK(consecutive_missed_count>=0),
  current_credential_id uuid REFERENCES robot_production_credentials(id),
  projection_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verified_operating_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  robot_owner_organization_id uuid NOT NULL REFERENCES organizations(id),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),
  assignment_id uuid NOT NULL REFERENCES robot_assignments(id),
  facility_id uuid NOT NULL REFERENCES facilities(id),
  department_id uuid REFERENCES departments(id),
  financial_configuration_version_id uuid NOT NULL REFERENCES financial_configuration_versions(id),
  interval_start_at timestamptz NOT NULL,
  interval_end_at timestamptz,
  verified_duration_seconds integer NOT NULL DEFAULT 0 CHECK(verified_duration_seconds>=0),
  status text NOT NULL CHECK(status IN ('open','closed','held','invalidated','superseded','finalized')),
  source_method text NOT NULL CHECK(source_method IN ('heartbeat_continuity','administrative_correction')),
  evidence_start_message_id uuid NOT NULL,
  evidence_end_message_id uuid,
  calculation_version integer NOT NULL CHECK(calculation_version>0),
  review_status text NOT NULL CHECK(review_status IN ('not_required','pending','approved','rejected','disputed')),
  hold_reason text,
  finalized_at timestamptz,
  supersedes_interval_id uuid REFERENCES verified_operating_intervals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(interval_end_at IS NULL OR interval_end_at>interval_start_at),
  CHECK((status='open' AND interval_end_at IS NULL) OR status<>'open')
);
CREATE UNIQUE INDEX verified_intervals_one_open ON verified_operating_intervals(robot_id,assignment_id)
  WHERE status='open';
ALTER TABLE verified_operating_intervals ADD CONSTRAINT verified_intervals_no_overlap
  EXCLUDE USING gist (robot_id WITH =, assignment_id WITH =,
    tstzrange(interval_start_at,COALESCE(interval_end_at,'infinity'),'[)') WITH &&)
  WHERE (status IN ('open','closed','held','finalized'));

CREATE OR REPLACE FUNCTION protect_finalized_operating_interval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR OLD.status='finalized' THEN
    RAISE EXCEPTION 'finalized operating intervals are immutable';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER verified_intervals_finalized_guard BEFORE UPDATE OR DELETE ON verified_operating_intervals
FOR EACH ROW EXECUTE FUNCTION protect_finalized_operating_interval();

CREATE TABLE robot_operational_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  assignment_id uuid REFERENCES robot_assignments(id),
  contract_id uuid REFERENCES contracts(id),
  hiring_company_id uuid REFERENCES hiring_companies(id),
  manufacturer_id uuid REFERENCES manufacturers(id),
  owner_organization_id uuid REFERENCES organizations(id),
  facility_id uuid REFERENCES facilities(id),
  department_id uuid REFERENCES departments(id),
  incident_type text NOT NULL,
  source text NOT NULL CHECK(source IN ('automatic','hiring_company','manufacturer','robot_owner','platform')),
  severity text NOT NULL CHECK(severity IN ('informational','low','medium','high','critical')),
  status text NOT NULL CHECK(status IN ('open','acknowledged','under_review','resolved','dismissed')),
  detected_at timestamptz NOT NULL,
  reported_at timestamptz,
  resolved_at timestamptz,
  reported_by_user_id uuid REFERENCES users(id),
  reported_by_organization_id uuid REFERENCES organizations(id),
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  resolution text,
  related_heartbeat_message_id uuid,
  related_downtime_interval_id uuid,
  state_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX operational_incident_open_automatic_unique
  ON robot_operational_incidents(robot_id,assignment_id,incident_type)
  WHERE source='automatic' AND status IN ('open','acknowledged','under_review');

CREATE TABLE robot_downtime_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  assignment_id uuid REFERENCES robot_assignments(id),
  contract_id uuid REFERENCES contracts(id),
  facility_id uuid REFERENCES facilities(id),
  department_id uuid REFERENCES departments(id),
  downtime_start_at timestamptz NOT NULL,
  downtime_end_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK(duration_seconds>=0),
  downtime_type text NOT NULL,
  detected_by text NOT NULL,
  status text NOT NULL CHECK(status IN ('open','closed','under_review','resolved','invalidated')),
  reason_code text NOT NULL,
  source_incident_id uuid REFERENCES robot_operational_incidents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(downtime_end_at IS NULL OR downtime_end_at>downtime_start_at)
);
ALTER TABLE robot_operational_incidents ADD CONSTRAINT incident_downtime_fk
  FOREIGN KEY(related_downtime_interval_id) REFERENCES robot_downtime_intervals(id);
CREATE UNIQUE INDEX downtime_one_open_automatic ON robot_downtime_intervals(robot_id,assignment_id,downtime_type)
  WHERE status='open';

CREATE TABLE operating_time_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  assignment_id uuid REFERENCES robot_assignments(id),
  contract_id uuid REFERENCES contracts(id),
  interval_id uuid REFERENCES verified_operating_intervals(id),
  incident_id uuid REFERENCES robot_operational_incidents(id),
  hold_type text NOT NULL CHECK(hold_type IN ('identity_review','fraud_review','company_inactivity_report',
    'credential_review','assignment_mismatch','schedule_mismatch','manual_operational_review')),
  status text NOT NULL CHECK(status IN ('active','released','confirmed_invalid','superseded')),
  reason text NOT NULL,
  placed_by_user_id uuid REFERENCES users(id),
  placed_by_system boolean NOT NULL DEFAULT false,
  placed_at timestamptz NOT NULL,
  released_at timestamptz,
  released_by_user_id uuid REFERENCES users(id),
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX operating_holds_active_unique ON operating_time_holds(interval_id,hold_type)
  WHERE status='active';

CREATE TABLE heartbeat_fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid REFERENCES robots(id),
  credential_id uuid REFERENCES robot_production_credentials(id),
  assignment_id uuid REFERENCES robot_assignments(id),
  signal_type text NOT NULL,
  severity text NOT NULL CHECK(severity IN ('informational','low','medium','high','critical')),
  score integer NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 100),
  message_id uuid,
  incident_id uuid REFERENCES robot_operational_incidents(id),
  evidence jsonb NOT NULL DEFAULT '{}',
  detected_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  reviewed_by_user_id uuid REFERENCES users(id),
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW verified_operating_daily_summaries AS
SELECT (interval_start_at AT TIME ZONE 'UTC')::date summary_date,robot_id,
  robot_owner_organization_id owner_organization_id,manufacturer_id,hiring_company_id,
  contract_id,assignment_id,
  COALESCE(SUM(verified_duration_seconds) FILTER(WHERE status IN ('closed','finalized')),0)::bigint verified_seconds,
  COALESCE(SUM(verified_duration_seconds) FILTER(WHERE status='held'),0)::bigint held_seconds,
  COUNT(*)::integer interval_count,MAX(updated_at) last_reconciled_at,MAX(calculation_version) calculation_version
FROM verified_operating_intervals
GROUP BY 1,robot_id,robot_owner_organization_id,manufacturer_id,hiring_company_id,contract_id,assignment_id;
