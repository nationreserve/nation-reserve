-- Compatibility bridge for adapters introduced after the original immutable audit schema.
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_type text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS before jsonb,
  ADD COLUMN IF NOT EXISTS after jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE audit_logs ALTER COLUMN resource_type DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN resource_id DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN source DROP NOT NULL;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS locked_by text;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE contract_versions
  ADD COLUMN status text NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','submitted','pending_manufacturer_approval',
      'pending_company_approval','approved','rejected','superseded')),
  ADD COLUMN start_at timestamptz,
  ADD COLUMN end_at timestamptz,
  ADD COLUMN manufacturer_approved_at timestamptz,
  ADD COLUMN manufacturer_approved_by_user_id uuid REFERENCES users(id),
  ADD COLUMN company_approved_at timestamptz,
  ADD COLUMN company_approved_by_user_id uuid REFERENCES users(id),
  ADD COLUMN rejected_at timestamptz,
  ADD COLUMN rejected_by_user_id uuid REFERENCES users(id),
  ADD COLUMN rejection_reason text,
  ADD CONSTRAINT contract_versions_date_valid CHECK(end_at IS NULL OR start_at IS NULL OR end_at>start_at);

CREATE TABLE contract_version_robot_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),
  robot_model_id uuid NOT NULL REFERENCES robot_models(id),
  robot_model_revision_id uuid REFERENCES robot_model_revisions(id),
  requested_quantity integer NOT NULL CHECK(requested_quantity>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_version_id,robot_model_id,robot_model_revision_id)
);

CREATE TABLE contract_approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),
  party text NOT NULL CHECK(party IN ('hiring_company','manufacturer','platform')),
  decision text NOT NULL CHECK(decision IN ('approved','changes_requested','rejected','cancelled')),
  decided_by_user_id uuid NOT NULL REFERENCES users(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contract_schedule_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),
  timezone text NOT NULL,
  day_of_week smallint NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  local_start_time time NOT NULL,
  local_end_time time NOT NULL,
  recurrence_start date NOT NULL,
  recurrence_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(local_end_time>local_start_time),
  CHECK(recurrence_end IS NULL OR recurrence_end>=recurrence_start)
);

CREATE TABLE contract_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),
  exception_date date NOT NULL,
  exception_type text NOT NULL CHECK(exception_type IN ('holiday','blackout','override')),
  local_start_time time,
  local_end_time time,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_version_id,exception_date,exception_type),
  CHECK(exception_type<>'override' OR
    (local_start_time IS NOT NULL AND local_end_time IS NOT NULL AND local_end_time>local_start_time))
);

CREATE TABLE assignment_state_history (
  id bigserial PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES robot_assignments(id),
  previous_status text,
  new_status text NOT NULL,
  actor_type text NOT NULL,
  actor_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE robot_assignments DROP CONSTRAINT robot_assignments_status_check;
ALTER TABLE robot_assignments ADD CONSTRAINT robot_assignments_status_check
  CHECK(status IN ('pending','reserved','ready','scheduled','active','paused',
    'interrupted','completed','cancelled','replaced'));
ALTER TABLE robot_assignments ADD COLUMN cancellation_party text
  CHECK(cancellation_party IN ('hiring_company','manufacturer','platform'));
ALTER TABLE robot_assignments ADD COLUMN cancellation_reason text;
ALTER TABLE robot_assignments ADD COLUMN cancelled_at timestamptz;
ALTER TABLE robot_assignments ADD COLUMN readiness_checked_at timestamptz;

CREATE INDEX contract_versions_status_idx ON contract_versions(status,created_at);
CREATE INDEX contract_models_model_idx ON contract_version_robot_models(robot_model_id);
CREATE INDEX contract_approvals_version_idx ON contract_approval_events(contract_version_id,created_at);
CREATE INDEX contract_schedule_rules_version_idx ON contract_schedule_rules(contract_version_id);
CREATE INDEX assignment_history_assignment_idx ON assignment_state_history(assignment_id,created_at);

