ALTER TABLE manufacturers
  ADD COLUMN sandbox_approved_at timestamptz,
  ADD COLUMN production_approved_at timestamptz,
  ADD COLUMN suspended_at timestamptz,
  ADD COLUMN technical_contact_email text,
  ADD COLUMN support_contact_email text,
  ADD COLUMN default_api_version text NOT NULL DEFAULT 'v1',
  ADD COLUMN integration_status text NOT NULL DEFAULT 'not_started'
    CHECK (integration_status IN ('not_started','documentation_review','credentials_issued',
      'sandbox_testing','sandbox_verified','production_pending','production_enabled',
      'restricted','suspended'));

ALTER TABLE robot_models
  ADD COLUMN description text,
  ADD COLUMN robot_category text,
  ADD COLUMN physical_specifications jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN environmental_limits jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN heartbeat_capabilities jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN documentation_references jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by_user_id uuid REFERENCES users(id),
  ADD COLUMN decision_reason text;

ALTER TABLE robots
  ADD COLUMN robot_model_revision_id uuid,
  ADD COLUMN environment text NOT NULL DEFAULT 'production'
    CHECK (environment IN ('sandbox','production')),
  ADD COLUMN hardware_identity_status text NOT NULL DEFAULT 'not_registered'
    CHECK (hardware_identity_status IN ('not_registered','pending','confirmed','rejected','revoked'));

CREATE TABLE manufacturer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  revision_number integer NOT NULL DEFAULT 1 CHECK (revision_number > 0),
  is_current boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review',
    'information_requested','sandbox_approved','production_review','production_approved',
    'rejected','withdrawn','suspended')),
  legal_business_name text NOT NULL,
  website_url text,
  support_email text NOT NULL,
  technical_contact_name text NOT NULL,
  technical_contact_email text NOT NULL,
  operations_contact_name text NOT NULL,
  operations_contact_email text NOT NULL,
  primary_country_code text NOT NULL CHECK (char_length(primary_country_code)=2),
  business_description text NOT NULL,
  robot_categories jsonb NOT NULL DEFAULT '[]',
  anticipated_robot_volume integer CHECK (anticipated_robot_volume >= 0),
  integration_readiness jsonb NOT NULL DEFAULT '{}',
  compliance_attestation jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz, review_started_at timestamptz, reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES users(id), decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manufacturer_id, revision_number)
);
CREATE UNIQUE INDEX manufacturer_applications_current_unique
  ON manufacturer_applications(manufacturer_id) WHERE is_current;

CREATE TABLE robot_model_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_model_id uuid NOT NULL REFERENCES robot_models(id),
  revision_number integer NOT NULL CHECK (revision_number > 0),
  model_version text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '{}',
  physical_specifications jsonb NOT NULL DEFAULT '{}',
  environmental_limits jsonb NOT NULL DEFAULT '{}',
  supported_firmware_range text,
  supported_api_versions jsonb NOT NULL DEFAULT '[]',
  operational_state_mapping jsonb NOT NULL DEFAULT '{}',
  heartbeat_capabilities jsonb NOT NULL DEFAULT '{}',
  safety_restrictions jsonb NOT NULL DEFAULT '{}',
  regional_restrictions jsonb NOT NULL DEFAULT '{}',
  documentation_references jsonb NOT NULL DEFAULT '[]',
  change_reason text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review',
    'information_requested','sandbox_approved','production_approved','suspended','retired','rejected')),
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  submitted_at timestamptz, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(robot_model_id, revision_number)
);
ALTER TABLE robots ADD CONSTRAINT robots_model_revision_fk
  FOREIGN KEY(robot_model_revision_id) REFERENCES robot_model_revisions(id);
CREATE TRIGGER approved_robot_model_revisions_append_only
  BEFORE UPDATE OR DELETE ON robot_model_revisions
  FOR EACH ROW WHEN (OLD.status IN ('sandbox_approved','production_approved'))
  EXECUTE FUNCTION reject_mutation();

CREATE TABLE manufacturer_api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  credential_name text NOT NULL,
  credential_prefix text NOT NULL UNIQUE,
  secret_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','rotating','revoked','expired','compromised')),
  scopes jsonb NOT NULL DEFAULT '[]',
  allowed_api_versions jsonb NOT NULL DEFAULT '[]',
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz,
  expires_at timestamptz NOT NULL, rotated_at timestamptz, revoked_at timestamptz,
  revocation_reason text, overlap_ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE robot_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  robot_model_id uuid NOT NULL REFERENCES robot_models(id),
  robot_model_revision_id uuid NOT NULL REFERENCES robot_model_revisions(id),
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  manufacturer_serial_number text NOT NULL, normalized_serial_number text NOT NULL,
  hardware_revision text, firmware_version text,
  hardware_identity_type text, hardware_identity_value_hash text,
  region_code text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','validating','accepted',
    'manual_review','rejected','duplicate','cancelled')),
  submitted_by_credential_id uuid REFERENCES manufacturer_api_credentials(id),
  submitted_by_user_id uuid REFERENCES users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES users(id), decision_reason text,
  robot_id uuid REFERENCES robots(id), idempotency_key text NOT NULL,
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manufacturer_id, environment, idempotency_key)
);
CREATE UNIQUE INDEX robot_registration_production_serial_unique
  ON robot_registration_requests(manufacturer_id, normalized_serial_number)
  WHERE environment='production' AND status='accepted';

CREATE TABLE robot_hardware_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  environment text NOT NULL CHECK(environment IN ('sandbox','production')),
  identity_type text NOT NULL CHECK(identity_type IN ('device_key','certificate_fingerprint',
    'secure_element','manufacturer_device_id','hardware_public_key')),
  identity_hash text NOT NULL,
  display_identifier text,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','replaced')),
  created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
  UNIQUE(environment, identity_type, identity_hash)
);

CREATE TABLE robot_transfer_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  code_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','consumed','expired','revoked')),
  expires_at timestamptz NOT NULL, consumed_at timestamptz,
  consumed_by_organization_id uuid REFERENCES organizations(id),
  created_by_user_id uuid REFERENCES users(id), revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(expires_at > created_at)
);

CREATE TABLE robot_ownership_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  owner_organization_id uuid NOT NULL REFERENCES organizations(id),
  transfer_code_id uuid REFERENCES robot_transfer_codes(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','verified','rejected','disputed','withdrawn')),
  submitted_by_user_id uuid NOT NULL REFERENCES users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES users(id), decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX robot_ownership_claims_current_unique ON robot_ownership_claims(robot_id)
  WHERE status IN ('pending','verified','disputed');

CREATE TABLE robot_activation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  environment text NOT NULL CHECK(environment IN ('sandbox','production')),
  status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','in_progress','passed','failed','cancelled','expired')),
  request_id uuid NOT NULL UNIQUE,
  started_by_user_id uuid REFERENCES users(id),
  started_by_credential_id uuid REFERENCES manufacturer_api_credentials(id),
  started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  completed_at timestamptz, failure_reason text,
  expected_robot_state_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(expires_at > started_at)
);
CREATE UNIQUE INDEX robot_activation_sessions_active_unique ON robot_activation_sessions(robot_id)
  WHERE status IN ('pending','in_progress');

CREATE TABLE robot_activation_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_session_id uuid NOT NULL REFERENCES robot_activation_sessions(id),
  check_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started'
    CHECK(status IN ('not_started','pending','passed','failed','not_required')),
  details jsonb NOT NULL DEFAULT '{}',
  checked_at timestamptz,
  UNIQUE(activation_session_id, check_type)
);

CREATE TABLE activation_test_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_session_id uuid NOT NULL REFERENCES robot_activation_sessions(id),
  request_id uuid NOT NULL UNIQUE,
  nonce text NOT NULL UNIQUE,
  manufacturer_state text NOT NULL,
  mapped_platform_state text NOT NULL,
  message_timestamp timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK(result IN ('accepted','rejected')),
  rejection_reason text
);

CREATE TABLE manufacturer_integration_logs (
  id bigserial PRIMARY KEY,
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  credential_id uuid REFERENCES manufacturer_api_credentials(id),
  environment text NOT NULL CHECK(environment IN ('sandbox','production')),
  request_id uuid NOT NULL, operation text NOT NULL, result text NOT NULL,
  safe_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE robot_state_history (
  id bigserial PRIMARY KEY,
  robot_id uuid NOT NULL REFERENCES robots(id),
  state_dimension text NOT NULL, previous_state text, new_state text NOT NULL,
  reason text NOT NULL, actor_type text NOT NULL, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER manufacturer_applications_updated_at BEFORE UPDATE ON manufacturer_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER manufacturer_api_credentials_updated_at BEFORE UPDATE ON manufacturer_api_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER robot_registration_requests_updated_at BEFORE UPDATE ON robot_registration_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER robot_ownership_claims_updated_at BEFORE UPDATE ON robot_ownership_claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER robot_activation_sessions_updated_at BEFORE UPDATE ON robot_activation_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

