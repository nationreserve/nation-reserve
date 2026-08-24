ALTER TABLE users
  ADD COLUMN email_verified_at timestamptz,
  ADD COLUMN last_login_at timestamptz;
UPDATE users SET email_normalized = lower(trim(email));

CREATE TABLE user_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  password_hash text NOT NULL,
  password_algorithm text NOT NULL CHECK (password_algorithm = 'argon2id'),
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  last_failed_login_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  email_normalized text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX email_verification_active_idx
  ON email_verification_tokens(user_id, email_normalized, expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  requested_ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX password_reset_active_idx ON password_reset_tokens(user_id, expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  session_family_id uuid NOT NULL,
  refresh_token_hash text NOT NULL UNIQUE,
  previous_refresh_token_hash text,
  refresh_token_version integer NOT NULL DEFAULT 1 CHECK (refresh_token_version > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','revoked','expired','compromised')),
  created_ip inet,
  last_seen_ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revocation_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX auth_sessions_user_active_idx ON auth_sessions(user_id, expires_at)
  WHERE status = 'active';
CREATE INDEX auth_sessions_family_idx ON auth_sessions(session_family_id);

CREATE TABLE authentication_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  result text NOT NULL CHECK (result IN ('success','failure','blocked')),
  ip_address inet,
  user_agent text,
  session_id uuid REFERENCES auth_sessions(id),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX authentication_events_user_time_idx
  ON authentication_events(user_id, created_at DESC);

CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  email_normalized text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by_user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_by_user_id uuid REFERENCES users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX organization_invitations_pending_unique
  ON organization_invitations(organization_id, email_normalized, role)
  WHERE status = 'pending';

CREATE TABLE user_organization_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  default_organization_id uuid REFERENCES organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION validate_organization_role()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org_type text;
BEGIN
  SELECT organization_type INTO org_type FROM organizations WHERE id = NEW.organization_id;
  IF NOT (
    (org_type = 'robot_owner' AND NEW.role IN ('owner','manager','viewer')) OR
    (org_type = 'hiring_company' AND NEW.role IN ('employee','supervisor','manager','administrator')) OR
    (org_type = 'manufacturer' AND NEW.role IN ('viewer','engineer','manager','administrator')) OR
    (org_type = 'platform' AND NEW.role IN ('support','operations','billing','security','platform_admin','super_admin'))
  ) THEN RAISE EXCEPTION 'role % is incompatible with organization type %', NEW.role, org_type;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER organization_memberships_role_compatibility
  BEFORE INSERT OR UPDATE OF organization_id, role ON organization_memberships
  FOR EACH ROW EXECUTE FUNCTION validate_organization_role();
CREATE TRIGGER organization_invitations_role_compatibility
  BEFORE INSERT OR UPDATE OF organization_id, role ON organization_invitations
  FOR EACH ROW EXECUTE FUNCTION validate_organization_role();

CREATE OR REPLACE FUNCTION validate_default_organization()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.default_organization_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = NEW.user_id AND organization_id = NEW.default_organization_id
      AND status = 'active'
  ) THEN RAISE EXCEPTION 'default organization requires active membership';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER user_default_organization_membership
  BEFORE INSERT OR UPDATE ON user_organization_preferences
  FOR EACH ROW EXECUTE FUNCTION validate_default_organization();

CREATE TRIGGER user_credentials_updated_at BEFORE UPDATE ON user_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER auth_sessions_updated_at BEFORE UPDATE ON auth_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organization_invitations_updated_at BEFORE UPDATE ON organization_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER user_organization_preferences_updated_at BEFORE UPDATE ON user_organization_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

