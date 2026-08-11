-- Prompt 008 completion: retries, reconciliation exceptions, notifications, and executable settlement states.
ALTER TABLE payment_attempts ADD COLUMN retry_of_attempt_id uuid REFERENCES payment_attempts(id);
ALTER TABLE payment_attempts ADD COLUMN provider_status_at timestamptz;
ALTER TABLE payout_attempts ADD COLUMN retry_of_attempt_id uuid REFERENCES payout_attempts(id);
ALTER TABLE payout_attempts ADD COLUMN provider_status_at timestamptz;
ALTER TABLE payment_refunds ADD COLUMN provider_status_at timestamptz;

CREATE INDEX payment_attempt_retry_idx ON payment_attempts(retry_of_attempt_id) WHERE retry_of_attempt_id IS NOT NULL;
CREATE INDEX payout_attempt_retry_idx ON payout_attempts(retry_of_attempt_id) WHERE retry_of_attempt_id IS NOT NULL;
CREATE INDEX payment_attempt_retry_due_idx ON payment_attempts(next_retry_at) WHERE status='failed' AND next_retry_at IS NOT NULL;
CREATE INDEX payout_attempt_retry_due_idx ON payout_attempts(next_retry_at) WHERE status='failed' AND next_retry_at IS NOT NULL;

CREATE TABLE payment_reconciliation_exceptions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reconciliation_run_id uuid NOT NULL REFERENCES payment_reconciliation_runs(id),
 exception_type text NOT NULL,severity text NOT NULL CHECK(severity IN('info','warning','critical')),
 resource_type text NOT NULL,resource_id uuid NOT NULL,provider_object_id text,expected_state text,observed_state text,
 status text NOT NULL DEFAULT 'open' CHECK(status IN('open','repaired','acknowledged','ignored')),
 repair_action text,resolved_at timestamptz,resolved_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX payment_reconciliation_exception_open_idx ON payment_reconciliation_exceptions(status,severity,created_at);

CREATE TABLE payment_notifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),audience_type text NOT NULL CHECK(audience_type IN('organization','platform')),
 organization_id uuid REFERENCES organizations(id),notification_type text NOT NULL,resource_type text NOT NULL,
 resource_id uuid NOT NULL,severity text NOT NULL CHECK(severity IN('info','warning','critical')),
 mandatory boolean NOT NULL DEFAULT true,status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sent','failed','dismissed')),
 safe_payload jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,
 UNIQUE(notification_type,resource_type,resource_id));
CREATE INDEX payment_notification_pending_idx ON payment_notifications(status,created_at) WHERE status='pending';

ALTER TABLE settlement_batches DROP CONSTRAINT IF EXISTS settlement_batches_status_check;
ALTER TABLE settlement_batches ADD CONSTRAINT settlement_batches_status_check CHECK(status IN
 ('draft','prepared','pending_approval','approved','ready_for_submission','submitted','processing','partially_completed','completed','failed','cancelled'));
ALTER TABLE settlement_batches DROP CONSTRAINT IF EXISTS settlement_batches_check;
ALTER TABLE settlement_batches ADD CONSTRAINT settlement_batches_lifecycle_check CHECK(
 (status NOT IN('submitted','processing','partially_completed','completed','failed') OR submitted_at IS NOT NULL)
 AND (status<>'completed' OR completed_at IS NOT NULL)
 AND (status<>'failed' OR failed_at IS NOT NULL));
ALTER TABLE settlement_batch_items DROP CONSTRAINT IF EXISTS settlement_batch_items_status_check;
ALTER TABLE settlement_batch_items ADD CONSTRAINT settlement_batch_items_status_check CHECK(status IN
 ('pending','held','ready','submitted','processing','succeeded','failed','cancelled'));

CREATE OR REPLACE FUNCTION validate_external_money_amounts() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE eligible bigint;refunded bigint;
BEGIN
 IF TG_TABLE_NAME='payment_attempts' THEN
  SELECT amount_due_minor_units INTO eligible FROM company_invoices WHERE id=NEW.invoice_id;
  IF eligible IS NULL OR NEW.amount_minor_units>eligible THEN RAISE EXCEPTION 'payment amount exceeds invoice amount due'; END IF;
 ELSIF TG_TABLE_NAME='payout_attempts' THEN
  SELECT net_earning_minor_units-held_minor_units-paid_minor_units INTO eligible FROM robot_owner_earnings_statements WHERE id=NEW.statement_id;
  IF eligible IS NULL OR NEW.amount_minor_units>eligible THEN RAISE EXCEPTION 'payout amount exceeds eligible payable'; END IF;
 ELSIF TG_TABLE_NAME='payment_refunds' THEN
  SELECT p.amount_minor_units-COALESCE(SUM(r.amount_minor_units) FILTER(WHERE r.status NOT IN('failed','cancelled')),0)
    INTO eligible FROM payment_attempts p LEFT JOIN payment_refunds r ON r.payment_attempt_id=p.id AND r.id<>NEW.id
    WHERE p.id=NEW.payment_attempt_id GROUP BY p.amount_minor_units;
  IF eligible IS NULL OR NEW.amount_minor_units>eligible THEN RAISE EXCEPTION 'refund amount exceeds refundable amount'; END IF;
 END IF;RETURN NEW;
END;$$;
CREATE TRIGGER payment_attempt_amount_guard BEFORE INSERT ON payment_attempts FOR EACH ROW EXECUTE FUNCTION validate_external_money_amounts();
CREATE TRIGGER payout_attempt_amount_guard BEFORE INSERT ON payout_attempts FOR EACH ROW EXECUTE FUNCTION validate_external_money_amounts();
CREATE TRIGGER payment_refund_amount_guard BEFORE INSERT OR UPDATE OF amount_minor_units ON payment_refunds FOR EACH ROW EXECUTE FUNCTION validate_external_money_amounts();