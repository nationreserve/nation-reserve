CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','restricted','suspended','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized_unique UNIQUE (email_normalized),
  CONSTRAINT users_email_normalized_lower CHECK (email_normalized = lower(btrim(email_normalized)))
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text NOT NULL,
  organization_type text NOT NULL
    CHECK (organization_type IN ('robot_owner','hiring_company','manufacturer','platform')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','restricted','suspended','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','active','suspended','removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_membership_identity_unique UNIQUE (organization_id, user_id)
);

CREATE UNIQUE INDEX organization_memberships_active_unique
  ON organization_memberships (organization_id, user_id)
  WHERE status = 'active';

CREATE TABLE manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id),
  approval_status text NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft','submitted','under_review','sandbox_approved','production_approved','rejected','suspended')),
  production_access_status text NOT NULL DEFAULT 'disabled'
    CHECK (production_access_status IN ('disabled','sandbox','production','restricted')),
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE robot_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  model_name text NOT NULL,
  model_code text NOT NULL,
  model_version text NOT NULL,
  approval_status text NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft','submitted','under_review','sandbox_approved','production_approved','suspended','retired','rejected')),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  supported_firmware_range text,
  supported_api_versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  operational_state_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  regional_restrictions jsonb NOT NULL DEFAULT '{}'::jsonb,
  safety_restrictions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT robot_models_manufacturer_code_version_unique
    UNIQUE (manufacturer_id, model_code, model_version)
);

CREATE TABLE robots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  robot_model_id uuid NOT NULL REFERENCES robot_models(id),
  manufacturer_serial_number text NOT NULL,
  normalized_serial_number text NOT NULL,
  hardware_revision text,
  firmware_version text,
  region_code text,
  registration_state text NOT NULL
    CHECK (registration_state IN ('draft','registered','registration_rejected','registration_conflict','archived')),
  ownership_state text NOT NULL
    CHECK (ownership_state IN ('unassigned','ownership_pending','ownership_verified','ownership_disputed','transfer_pending','ownership_restricted')),
  activation_state text NOT NULL
    CHECK (activation_state IN ('not_eligible','awaiting_activation','activation_in_progress','activation_failed','activated','reactivation_required')),
  heartbeat_state text NOT NULL
    CHECK (heartbeat_state IN ('never_connected','connecting','online','degraded','offline','invalid','credential_restricted')),
  operational_state text NOT NULL
    CHECK (operational_state IN ('unavailable','available','reserved','assigned','operating','paused','charging','faulted','emergency_stopped')),
  maintenance_state text NOT NULL
    CHECK (maintenance_state IN ('no_maintenance','maintenance_requested','maintenance_scheduled','in_maintenance','awaiting_verification','maintenance_completed','maintenance_disputed')),
  compliance_state text NOT NULL
    CHECK (compliance_state IN ('eligible','review_required','restricted','suspended','banned')),
  financial_eligibility_state text NOT NULL
    CHECK (financial_eligibility_state IN ('not_payable','potentially_payable','payable','payment_review','financial_hold')),
  final_lifecycle_state text NOT NULL
    CHECK (final_lifecycle_state IN ('active','transferred','replaced','retired','decommissioned','destroyed','lost','stolen')),
  state_version integer NOT NULL DEFAULT 1 CHECK (state_version > 0),
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT robots_manufacturer_serial_unique UNIQUE (manufacturer_id, normalized_serial_number),
  CONSTRAINT robots_retired_timestamp_check CHECK (
    (final_lifecycle_state IN ('retired','decommissioned','destroyed') AND retired_at IS NOT NULL)
    OR final_lifecycle_state NOT IN ('retired','decommissioned','destroyed')
  )
);

CREATE TABLE robot_ownership_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id uuid NOT NULL REFERENCES robots(id),
  owner_organization_id uuid NOT NULL REFERENCES organizations(id),
  ownership_status text NOT NULL
    CHECK (ownership_status IN ('pending','verified','rejected','disputed','ended')),
  ownership_start_at timestamptz NOT NULL,
  ownership_end_at timestamptz,
  acquisition_method text NOT NULL,
  source_reference text,
  verification_method text NOT NULL,
  approved_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT robot_ownership_date_valid
    CHECK (ownership_end_at IS NULL OR ownership_end_at > ownership_start_at),
  CONSTRAINT robot_verified_ownership_no_overlap
    EXCLUDE USING gist (
      robot_id WITH =,
      tstzrange(ownership_start_at, COALESCE(ownership_end_at, 'infinity'::timestamptz), '[)') WITH &&
    ) WHERE (ownership_status = 'verified')
);

CREATE TABLE hiring_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','under_review','verified','rejected','suspended')),
  billing_status text NOT NULL DEFAULT 'not_configured'
    CHECK (billing_status IN ('not_configured','pending','active','past_due','restricted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),
  name text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  state_region text,
  postal_code text,
  country_code char(2) NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX departments_active_name_unique
  ON departments (facility_id, lower(name))
  WHERE status = 'active';

CREATE TABLE financial_configuration_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL UNIQUE CHECK (version > 0),
  currency char(3) NOT NULL,
  base_rate_minor_units_per_hour integer NOT NULL CHECK (base_rate_minor_units_per_hour > 0),
  owner_platform_fee_basis_points integer NOT NULL
    CHECK (owner_platform_fee_basis_points BETWEEN 0 AND 10000),
  company_platform_fee_basis_points integer NOT NULL
    CHECK (company_platform_fee_basis_points BETWEEN 0 AND 10000),
  effective_at timestamptz NOT NULL,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','expired','superseded')),
  approved_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_configuration_date_valid
    CHECK (expires_at IS NULL OR expires_at > effective_at),
  CONSTRAINT active_financial_configuration_no_overlap
    EXCLUDE USING gist (
      tstzrange(effective_at, COALESCE(expires_at, 'infinity'::timestamptz), '[)') WITH &&
    ) WHERE (status = 'active')
);

CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),
  facility_id uuid NOT NULL REFERENCES facilities(id),
  department_id uuid REFERENCES departments(id),
  contract_type text NOT NULL
    CHECK (contract_type IN ('ongoing','fixed_term','temporary','pilot')),
  status text NOT NULL
    CHECK (status IN ('draft','pending_manufacturer_approval','pending_company_approval','pending_both_approvals','approved','active','partially_fulfilled','fully_fulfilled','suspended','completed','cancelled','archived')),
  current_version_number integer NOT NULL DEFAULT 1 CHECK (current_version_number > 0),
  requested_robot_count integer NOT NULL CHECK (requested_robot_count > 0),
  assigned_robot_count integer NOT NULL DEFAULT 0 CHECK (assigned_robot_count >= 0),
  operating_robot_count integer NOT NULL DEFAULT 0 CHECK (operating_robot_count >= 0),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal','high','critical')),
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  renewal_mode text NOT NULL DEFAULT 'none'
    CHECK (renewal_mode IN ('none','manual','automatic')),
  rate_configuration_version_id uuid NOT NULL REFERENCES financial_configuration_versions(id),
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  approved_by_manufacturer_at timestamptz,
  approved_by_company_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contracts_date_valid CHECK (end_at IS NULL OR end_at > start_at),
  CONSTRAINT contract_summary_counts_valid CHECK (
    operating_robot_count <= assigned_robot_count
    AND assigned_robot_count <= requested_robot_count
  )
);

CREATE TABLE contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  version_number integer NOT NULL CHECK (version_number > 0),
  requested_robot_count integer NOT NULL CHECK (requested_robot_count > 0),
  operating_windows jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  location_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  special_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_versions_number_unique UNIQUE (contract_id, version_number)
);

CREATE TABLE robot_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),
  robot_id uuid NOT NULL REFERENCES robots(id),
  robot_owner_organization_id uuid NOT NULL REFERENCES organizations(id),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),
  facility_id uuid NOT NULL REFERENCES facilities(id),
  department_id uuid REFERENCES departments(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reserved','ready','active','paused','interrupted','completed','cancelled','replaced')),
  scheduled_start_at timestamptz NOT NULL,
  scheduled_end_at timestamptz NOT NULL,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  replacement_for_assignment_id uuid REFERENCES robot_assignments(id),
  completion_reason text,
  financial_status text NOT NULL DEFAULT 'not_eligible'
    CHECK (financial_status IN ('not_eligible','pending_verification','eligible','under_review','settled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assignment_scheduled_date_valid CHECK (scheduled_end_at > scheduled_start_at),
  CONSTRAINT assignment_actual_date_valid CHECK (
    actual_end_at IS NULL OR (actual_start_at IS NOT NULL AND actual_end_at > actual_start_at)
  ),
  CONSTRAINT assignment_no_self_replacement CHECK (replacement_for_assignment_id IS NULL OR replacement_for_assignment_id <> id),
  CONSTRAINT active_robot_assignment_no_overlap
    EXCLUDE USING gist (
      robot_id WITH =,
      tstzrange(scheduled_start_at, scheduled_end_at, '[)') WITH &&
    ) WHERE (status IN ('reserved','ready','active','paused','interrupted'))
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  actor_organization_id uuid REFERENCES organizations(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  source text NOT NULL,
  correlation_id uuid,
  request_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  metadata jsonb NOT NULL,
  correlation_id uuid,
  causation_id uuid,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','published','failed','dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX robot_ownership_owner_active_idx
  ON robot_ownership_records (owner_organization_id, ownership_start_at, ownership_end_at)
  WHERE ownership_status = 'verified';
CREATE INDEX robot_assignments_contract_idx ON robot_assignments (contract_id);
CREATE INDEX robot_assignments_robot_idx ON robot_assignments (robot_id);
CREATE INDEX audit_logs_resource_idx ON audit_logs (resource_type, resource_id, created_at);
CREATE INDEX outbox_events_dispatch_idx ON outbox_events (status, available_at, created_at);

CREATE VIEW contract_fulfillment_status AS
SELECT
  c.id AS contract_id,
  c.requested_robot_count,
  count(a.id) FILTER (WHERE a.status = 'reserved')::integer AS reserved_robot_count,
  count(a.id) FILTER (WHERE a.status IN ('ready','active','paused','interrupted'))::integer AS assigned_robot_count,
  count(a.id) FILTER (WHERE a.status = 'active')::integer AS operating_robot_count,
  count(a.id) FILTER (WHERE a.status = 'interrupted')::integer AS unavailable_robot_count,
  count(a.id) FILTER (WHERE a.status = 'interrupted')::integer AS replacement_needed_count,
  max(a.updated_at) AS last_reconciled_at
FROM contracts c
LEFT JOIN robot_assignments a ON a.contract_id = c.id
GROUP BY c.id, c.requested_robot_count;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON organization_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER manufacturers_set_updated_at BEFORE UPDATE ON manufacturers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER robot_models_set_updated_at BEFORE UPDATE ON robot_models
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER robots_set_updated_at BEFORE UPDATE ON robots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ownership_set_updated_at BEFORE UPDATE ON robot_ownership_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER hiring_companies_set_updated_at BEFORE UPDATE ON hiring_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER facilities_set_updated_at BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER departments_set_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER assignments_set_updated_at BEFORE UPDATE ON robot_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER outbox_set_updated_at BEFORE UPDATE ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER contract_versions_append_only
  BEFORE UPDATE OR DELETE ON contract_versions
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE OR REPLACE FUNCTION protect_verified_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.ownership_status = 'verified' THEN
    RAISE EXCEPTION 'verified ownership records cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.ownership_status = 'verified' THEN
    IF NEW.robot_id <> OLD.robot_id
      OR NEW.owner_organization_id <> OLD.owner_organization_id
      OR NEW.ownership_start_at <> OLD.ownership_start_at
      OR NEW.acquisition_method <> OLD.acquisition_method
      OR NEW.verification_method <> OLD.verification_method THEN
      RAISE EXCEPTION 'verified ownership identity and start fields are immutable';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER verified_ownership_protection
  BEFORE UPDATE OR DELETE ON robot_ownership_records
  FOR EACH ROW EXECUTE FUNCTION protect_verified_ownership();

CREATE OR REPLACE FUNCTION protect_active_financial_configuration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'active' THEN
    RAISE EXCEPTION 'active financial configuration versions are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER active_financial_configuration_immutable
  BEFORE UPDATE OR DELETE ON financial_configuration_versions
  FOR EACH ROW EXECUTE FUNCTION protect_active_financial_configuration();
