BEGIN;

CREATE TABLE acceptance_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('running','passed','failed','blocked')),
  environment text NOT NULL DEFAULT 'local',
  safe_checks_only boolean NOT NULL DEFAULT true,
  started_by uuid REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  artifact_uri text,
  CONSTRAINT acceptance_run_completion CHECK (
    (status = 'running' AND completed_at IS NULL) OR
    (status <> 'running' AND completed_at IS NOT NULL)
  )
);

CREATE TABLE acceptance_gaps (
  id text PRIMARY KEY,
  requirement_ids text[] NOT NULL DEFAULT '{}',
  feature text NOT NULL,
  description text NOT NULL,
  classification text NOT NULL CHECK (classification IN (
    'launch_blocking','pilot_blocking','general_availability_blocking',
    'high_priority_post_launch','approved_deferred','future_only'
  )),
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','waived')),
  responsible_domain text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution text
);

CREATE TABLE acceptance_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id text NOT NULL REFERENCES acceptance_gaps(id),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','expired','revoked')),
  reason text NOT NULL,
  affected_organizations uuid[] NOT NULL DEFAULT '{}',
  temporary_behavior text NOT NULL,
  risk text NOT NULL,
  expires_at timestamptz NOT NULL,
  follow_up_issue text NOT NULL,
  requested_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  step_up_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND step_up_verified_at IS NOT NULL))
);

CREATE INDEX acceptance_runs_started_idx ON acceptance_runs(started_at DESC);
CREATE INDEX acceptance_gaps_status_idx ON acceptance_gaps(classification,status);
CREATE INDEX acceptance_waivers_gap_idx ON acceptance_waivers(gap_id,status);

INSERT INTO permission_definitions(permission_key,description) VALUES
 ('acceptance.overview.read','Read platform acceptance overview'),
 ('acceptance.journeys.read','Read acceptance journey evidence'),
 ('acceptance.gaps.read','Read acceptance gaps'),
 ('acceptance.gaps.manage','Manage acceptance gaps'),
 ('acceptance.runs.read','Read acceptance runs'),
 ('acceptance.runs.execute','Execute safe acceptance checks'),
 ('acceptance.waivers.read','Read acceptance waivers'),
 ('acceptance.waivers.create','Create acceptance waiver requests'),
 ('acceptance.waivers.revoke','Revoke acceptance waivers')
ON CONFLICT(permission_key) DO NOTHING;

INSERT INTO role_permission_grants(organization_type,role,permission_key,effect)
SELECT 'platform', role, permission_key, 'allow'
FROM (VALUES('platform_admin'),('super_admin')) roles(role)
CROSS JOIN unnest(ARRAY[
 'acceptance.overview.read','acceptance.journeys.read','acceptance.gaps.read',
 'acceptance.gaps.manage','acceptance.runs.read','acceptance.runs.execute',
 'acceptance.waivers.read','acceptance.waivers.create','acceptance.waivers.revoke'
]) permissions(permission_key)
ON CONFLICT DO NOTHING;


COMMIT;

