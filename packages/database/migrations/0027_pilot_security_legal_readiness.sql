BEGIN;

CREATE TABLE legal_document_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_type text NOT NULL CHECK(document_type IN
 ('terms_of_service','privacy_policy','cookie_policy','acceptable_use','manufacturer_agreement','hiring_company_agreement','robot_owner_agreement')),
 version text NOT NULL,title text NOT NULL,content_sha256 text NOT NULL CHECK(content_sha256 ~ '^[a-f0-9]{64}$'),
 publication_status text NOT NULL DEFAULT 'draft' CHECK(publication_status IN('draft','approved','published','retired')),
 effective_at timestamptz,published_at timestamptz,approved_by_user_id uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(document_type,version),CHECK(publication_status NOT IN('approved','published') OR approved_by_user_id IS NOT NULL),
 CHECK(publication_status<>'published' OR (effective_at IS NOT NULL AND published_at IS NOT NULL)));

CREATE TABLE legal_acceptance_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_version_id uuid NOT NULL REFERENCES legal_document_versions(id),
 user_id uuid NOT NULL REFERENCES users(id),organization_id uuid REFERENCES organizations(id),accepted_at timestamptz NOT NULL DEFAULT now(),
 ip_hash text,user_agent_hash text,acceptance_context text NOT NULL,withdrawn_at timestamptz,
 UNIQUE(document_version_id,user_id,organization_id));
CREATE TRIGGER legal_acceptance_append_only BEFORE UPDATE OR DELETE ON legal_acceptance_records FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TABLE pilot_configurations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),environment text NOT NULL UNIQUE CHECK(environment IN('development','test','production')),
 invite_only boolean NOT NULL DEFAULT true,max_pilot_organizations integer NOT NULL CHECK(max_pilot_organizations>0),
 max_manufacturers integer NOT NULL CHECK(max_manufacturers>0),max_robot_owners integer NOT NULL CHECK(max_robot_owners>0),
 max_robots integer NOT NULL CHECK(max_robots>0),max_contracts integer NOT NULL CHECK(max_contracts>0),
 max_monthly_financial_volume_minor_units bigint NOT NULL CHECK(max_monthly_financial_volume_minor_units>=0),
 allowed_country_codes text[] NOT NULL DEFAULT '{}',allowed_region_codes text[] NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','approved','active','suspended','closed')),
 version integer NOT NULL DEFAULT 1,change_reason text NOT NULL,updated_by_user_id uuid NOT NULL REFERENCES users(id),
 approved_by_user_id uuid REFERENCES users(id),activated_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status NOT IN('approved','active') OR approved_by_user_id IS NOT NULL),CHECK(status<>'active' OR activated_at IS NOT NULL));
CREATE TABLE pilot_configuration_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),pilot_configuration_id uuid NOT NULL REFERENCES pilot_configurations(id),version integer NOT NULL,
 snapshot jsonb NOT NULL,changed_by_user_id uuid NOT NULL REFERENCES users(id),change_reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(pilot_configuration_id,version));
CREATE TRIGGER pilot_configuration_versions_append_only BEFORE UPDATE OR DELETE ON pilot_configuration_versions FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TABLE pilot_organization_enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),pilot_configuration_id uuid NOT NULL REFERENCES pilot_configurations(id),
 organization_id uuid NOT NULL REFERENCES organizations(id),organization_type text NOT NULL CHECK(organization_type IN('manufacturer','hiring_company','robot_owner')),
 status text NOT NULL DEFAULT 'invited' CHECK(status IN('invited','approved','active','suspended','withdrawn','completed')),
 invited_by_user_id uuid NOT NULL REFERENCES users(id),approved_by_user_id uuid REFERENCES users(id),invited_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz,activated_at timestamptz,ended_at timestamptz,UNIQUE(pilot_configuration_id,organization_id));

CREATE TABLE readiness_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),review_type text NOT NULL CHECK(review_type IN('security','privacy','legal','financial','heartbeat','operations','accessibility','performance','release')),
 status text NOT NULL CHECK(status IN('not_started','in_progress','passed','failed','blocked','conditionally_approved')),
 environment text NOT NULL,summary text NOT NULL,evidence jsonb NOT NULL DEFAULT '{}',reviewed_by_user_id uuid REFERENCES users(id),
 approved_by_user_id uuid REFERENCES users(id),completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE security_review_findings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),finding_key text NOT NULL UNIQUE,severity text NOT NULL CHECK(severity IN('critical','high','medium','low','informational')),
 title text NOT NULL,description text NOT NULL,affected_component text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN('open','in_progress','resolved','accepted_risk')),
 remediation text NOT NULL,evidence jsonb NOT NULL DEFAULT '{}',detected_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,resolved_by_user_id uuid REFERENCES users(id));

INSERT INTO permission_definitions(permission_key,description) VALUES
 ('pilot.configuration.read','Read pilot configuration'),('pilot.configuration.update','Update pilot configuration'),
 ('pilot.enrollment.read','Read pilot enrollments'),('pilot.enrollment.manage','Manage pilot enrollments'),
 ('legal.documents.read','Read legal document readiness'),('legal.documents.manage','Manage legal document versions'),
 ('readiness.reviews.read','Read launch readiness reviews'),('readiness.reviews.manage','Manage launch readiness reviews'),
 ('security.findings.read','Read security review findings'),('security.findings.manage','Manage security findings') ON CONFLICT DO NOTHING;
INSERT INTO role_permission_grants(organization_type,role,permission_key,effect)
SELECT 'platform',role,permission,'allow' FROM (VALUES('platform_admin'),('super_admin')) roles(role)
CROSS JOIN (VALUES('pilot.configuration.read'),('pilot.configuration.update'),('pilot.enrollment.read'),('pilot.enrollment.manage'),
('legal.documents.read'),('legal.documents.manage'),('readiness.reviews.read'),('readiness.reviews.manage'),('security.findings.read'),('security.findings.manage')) permissions(permission)
ON CONFLICT DO NOTHING;

COMMIT;

