ALTER TABLE contract_schedule_rules ADD COLUMN IF NOT EXISTS required_robot_count integer CHECK(required_robot_count>0);
ALTER TABLE contract_schedule_rules DROP CONSTRAINT IF EXISTS contract_schedule_rules_check;
ALTER TABLE contract_schedule_rules DROP CONSTRAINT IF EXISTS contract_schedule_rules_local_end_time_check;
ALTER TABLE contract_schedule_rules ADD COLUMN IF NOT EXISTS spans_midnight boolean GENERATED ALWAYS AS(local_end_time<=local_start_time) STORED;

CREATE TABLE robot_purchase_orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contract_id uuid NOT NULL REFERENCES contracts(id),quantity integer NOT NULL CHECK(quantity>0),
 status text NOT NULL CHECK(status IN('draft','submitted','approved','manufacturer_accepted','pending_fulfillment','fulfilled','cancelled','CAPACITY_REVIEW_REQUIRED')),
 capacity_snapshot_id uuid NOT NULL REFERENCES contract_capacity_snapshots(id),acknowledgment_id uuid REFERENCES purchase_limit_acknowledgments(id),
 created_by_user_id uuid NOT NULL REFERENCES users(id),idempotency_key text NOT NULL UNIQUE,version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE purchase_limit_acknowledgments ADD CONSTRAINT purchase_limit_order_fk FOREIGN KEY(purchase_order_id) REFERENCES robot_purchase_orders(id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX robot_purchase_orders_capacity_idx ON robot_purchase_orders(contract_id,status);

CREATE TABLE contribution_ledger_entries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),participant_id uuid NOT NULL REFERENCES users(id),contract_id uuid REFERENCES contracts(id),queue_entry_id uuid REFERENCES downpayment_queue_entries(id),
 allocation_id uuid REFERENCES direct_ownership_allocations(id),entry_type text NOT NULL CHECK(entry_type IN('CONTRIBUTION','RESERVATION','APPLICATION','CARRY_FORWARD','REFUND','ADJUSTMENT')),
 amount_cents bigint NOT NULL CHECK(amount_cents<>0),available_delta_cents bigint NOT NULL DEFAULT 0,reserved_delta_cents bigint NOT NULL DEFAULT 0,applied_delta_cents bigint NOT NULL DEFAULT 0,
 refunded_delta_cents bigint NOT NULL DEFAULT 0,adjustment_delta_cents bigint NOT NULL DEFAULT 0,idempotency_key text NOT NULL UNIQUE,metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER contribution_ledger_immutable BEFORE UPDATE OR DELETE ON contribution_ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TABLE training_compensation_ledger_entries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES training_sessions(id),participant_id uuid NOT NULL REFERENCES users(id),entry_type text NOT NULL,
 amount_cents bigint NOT NULL,approved_duration_seconds integer NOT NULL,rate_cents bigint NOT NULL,idempotency_key text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER training_compensation_immutable BEFORE UPDATE OR DELETE ON training_compensation_ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_mutation();

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_type text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_required_transactional boolean NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_attempted_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS failed_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

CREATE TABLE legacy_ticket_migration_reviews(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),legacy_table text NOT NULL,legacy_record_id text NOT NULL,participant_id uuid REFERENCES users(id),
 disposition text NOT NULL CHECK(disposition IN('CONVERTED','AMBIGUOUS_REVIEW_REQUIRED','HISTORICAL_ONLY')),conversion_amount_cents bigint,
 reason text NOT NULL,audit_metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(legacy_table,legacy_record_id));

INSERT INTO permission_definitions(permission_key,description) VALUES
('expansion.contract_capacity.write','Acknowledge capacity and manage ownership allocations'),
('expansion.training.write','Create and manage human training data'),
('expansion.marketplace.admin','Manage human wearable marketplace') ON CONFLICT DO NOTHING;
