-- Separate high-trust identity/business verification from authentication and payout onboarding.
-- Store provider state and identifiers only; raw identity documents remain with the provider.

CREATE TABLE individual_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL CHECK (provider IN ('stripe','fake')),
  provider_environment text NOT NULL CHECK (provider_environment IN ('test','live')),
  provider_session_id text NOT NULL,
  status text NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified','pending','verified','requires_input','requires_review','failed','cancelled','suspended','revoked')),
  last_error_code text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,provider_environment,provider_session_id)
);
CREATE UNIQUE INDEX individual_identity_current_session_idx
  ON individual_identity_verifications(user_id)
  WHERE status IN ('pending','verified');

CREATE TRIGGER individual_identity_verifications_updated
BEFORE UPDATE ON individual_identity_verifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE organization_verification_profiles (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id),
  business_verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (business_verification_status IN ('unverified','pending','verified','requires_input','rejected','suspended')),
  representative_authorization_status text NOT NULL DEFAULT 'unverified'
    CHECK (representative_authorization_status IN ('unverified','pending','verified','requires_input','rejected','suspended')),
  representative_user_id uuid REFERENCES users(id),
  reviewed_by_user_id uuid REFERENCES users(id),
  review_summary jsonb NOT NULL DEFAULT '{}',
  business_verified_at timestamptz,
  representative_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER organization_verification_profiles_updated
BEFORE UPDATE ON organization_verification_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE organization_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  object_id uuid NOT NULL REFERENCES stored_objects(id),
  document_type text NOT NULL CHECK (document_type IN (
    'business_registration','tax_document','representative_authorization','other'
  )),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','accepted','rejected','superseded')),
  submitted_by_user_id uuid NOT NULL REFERENCES users(id),
  reviewed_by_user_id uuid REFERENCES users(id),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,object_id)
);
CREATE TRIGGER organization_verification_documents_updated
BEFORE UPDATE ON organization_verification_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A system-defined initial value may have no human updater. Every later
-- administrative change still records the authenticated user and version reason.
ALTER TABLE platform_configuration ALTER COLUMN updated_by_user_id DROP NOT NULL;

INSERT INTO platform_configuration(
  key,category,value,value_type,environment,description,requires_restart,editable,updated_by_user_id
)
SELECT
  'contracts.employer_downpayment_basis_points','contracts','1000'::jsonb,'integer',
  environment,
  'Percentage of estimated contract value required from a hiring company before final approval (1000 = 10%).',
  false,true,NULL
FROM (VALUES ('development'),('test'),('production')) AS environments(environment)
ON CONFLICT(key,environment) DO NOTHING;

ALTER TABLE contracts
  ADD COLUMN estimated_contract_value_cents bigint NOT NULL DEFAULT 0
    CHECK (estimated_contract_value_cents >= 0);
ALTER TABLE contract_versions
  ADD COLUMN estimated_contract_value_cents bigint NOT NULL DEFAULT 0
    CHECK (estimated_contract_value_cents >= 0);

CREATE TABLE employer_contract_downpayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL UNIQUE REFERENCES contracts(id),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),
  hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),
  basis_points integer NOT NULL CHECK (basis_points BETWEEN 0 AND 10000),
  estimated_contract_value_cents bigint NOT NULL CHECK (estimated_contract_value_cents > 0),
  required_amount_cents bigint NOT NULL CHECK (required_amount_cents >= 0),
  status text NOT NULL DEFAULT 'required'
    CHECK (status IN ('required','processing','requires_action','settled','failed','cancelled','refund_pending','refunded')),
  provider text,
  provider_environment text CHECK (provider_environment IN ('test','live')),
  provider_customer_id text,
  provider_payment_intent_id text,
  payment_method_id uuid REFERENCES company_payment_methods(id),
  failure_code text,
  idempotency_key text UNIQUE,
  settled_journal_entry_id uuid REFERENCES journal_entries(id),
  settled_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,provider_environment,provider_payment_intent_id)
);
CREATE TRIGGER employer_contract_downpayments_updated
BEFORE UPDATE ON employer_contract_downpayments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE contract_payment_integrity_states (
  contract_id uuid PRIMARY KEY REFERENCES contracts(id),
  state text NOT NULL DEFAULT 'funded' CHECK (state IN (
    'funded','active','payment_warning','payment_failed','grace_recovery',
    'work_authorization_suspended','resolved_reactivated','terminated'
  )),
  last_payment_attempt_id uuid REFERENCES payment_attempts(id),
  failure_code text,
  warning_started_at timestamptz,
  failed_at timestamptz,
  suspended_at timestamptz,
  resolved_at timestamptz,
  terminated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER contract_payment_integrity_states_updated
BEFORE UPDATE ON contract_payment_integrity_states
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE contract_payment_integrity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  from_state text,
  to_state text NOT NULL,
  reason_code text NOT NULL,
  payment_attempt_id uuid REFERENCES payment_attempts(id),
  changed_by_system boolean NOT NULL DEFAULT true,
  changed_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- New tables inherit privilege revocations from migration 0040 defaults, but RLS
-- must be explicitly enabled because they are created after that migration.
ALTER TABLE individual_identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_verification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_contract_downpayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payment_integrity_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payment_integrity_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE individual_identity_verifications FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE organization_verification_profiles FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE organization_verification_documents FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE employer_contract_downpayments FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE contract_payment_integrity_states FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE contract_payment_integrity_history FROM PUBLIC;

DO $revoke_browser_roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE individual_identity_verifications FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE organization_verification_profiles FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE organization_verification_documents FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE employer_contract_downpayments FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE contract_payment_integrity_states FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE contract_payment_integrity_history FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE individual_identity_verifications FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE organization_verification_profiles FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE organization_verification_documents FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE employer_contract_downpayments FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE contract_payment_integrity_states FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE contract_payment_integrity_history FROM authenticated';
  END IF;
END
$revoke_browser_roles$;

INSERT INTO database_object_access_classification(
  schema_name,object_name,object_kind,access_classification,client_roles,
  read_policy,write_policy,organization_scope,notes
) VALUES
('public','individual_identity_verifications','TABLE','SERVER_ONLY','{}',
 'Backend API authorization only','Webhook/service updates only','Authenticated user or platform review',
 'No raw identity documents are stored'),
('public','employer_contract_downpayments','TABLE','SERVER_ONLY','{}',
 'Backend API authorization only','Payment webhook/service updates only','Hiring company and platform finance',
 'Config snapshot and processor identifiers; no card or bank details'),
('public','contract_payment_integrity_states','TABLE','SERVER_ONLY','{}',
 'Backend API authorization only','Payment processor/service transitions only','Contract parties and platform finance',
 'Controls RoboWorkPool work authorization only; never arbitrary robot hardware'),
('public','contract_payment_integrity_history','TABLE','SERVER_ONLY','{}',
 'Backend API authorization only','Append-only service transitions','Contract parties and platform finance',
 'Auditable payment-integrity transition history'),
('public','organization_verification_profiles','TABLE','SERVER_ONLY','{}',
 'Backend API authorization only','Platform review workflow only','Organization and platform review',
 'Business and representative state only')
,
('public','organization_verification_documents','TABLE','SERVER_ONLY','{}',
 'Backend API authorization only','Organization submission and platform review','Organization and platform review',
 'Private stored-object references only; document bytes remain in private object storage')
ON CONFLICT(schema_name,object_name,object_kind) DO NOTHING;

