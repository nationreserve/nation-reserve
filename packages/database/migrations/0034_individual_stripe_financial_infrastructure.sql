CREATE TABLE user_financial_profiles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL UNIQUE REFERENCES users(id),stripe_customer_id text UNIQUE,stripe_connected_account_id text UNIQUE,
 stripe_account_type text CHECK(stripe_account_type IN('express','standard','custom')),payments_enabled boolean NOT NULL DEFAULT false,payouts_enabled boolean NOT NULL DEFAULT false,
 charges_enabled boolean NOT NULL DEFAULT false,bank_account_linked boolean NOT NULL DEFAULT false,default_payment_method_id uuid,default_payment_method_type text,
 identity_verification_status text NOT NULL DEFAULT 'NOT_STARTED',requirements_due jsonb NOT NULL DEFAULT '[]',payout_schedule jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE user_payment_methods(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),provider text NOT NULL,provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),
 stripe_customer_id text NOT NULL,provider_payment_method_id text NOT NULL,payment_method_type text NOT NULL CHECK(payment_method_type IN('card','us_bank_account')),
 display_brand text,display_last4 text CHECK(display_last4 IS NULL OR length(display_last4)=4),expiration_month integer,expiration_year integer,bank_name_display text,
 status text NOT NULL CHECK(status IN('active','verification_pending','failed','expired','removed')),is_default boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),removed_at timestamptz,
 UNIQUE(provider,provider_environment,provider_payment_method_id));
CREATE UNIQUE INDEX user_payment_method_default_unique ON user_payment_methods(user_id) WHERE is_default AND status='active';
ALTER TABLE user_financial_profiles ADD CONSTRAINT user_financial_default_method_fk FOREIGN KEY(default_payment_method_id) REFERENCES user_payment_methods(id);

CREATE TABLE robot_funding_payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),allocation_id uuid REFERENCES direct_ownership_allocations(id),purpose text NOT NULL CHECK(purpose IN('DOWNPAYMENT','DIRECT_OWNERSHIP','OTHER_APPROVED_OWNERSHIP')),
 status text NOT NULL CHECK(status IN('CREATED','REQUIRES_PAYMENT_METHOD','REQUIRES_ACTION','PROCESSING','SUCCEEDED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED','DISPUTED','CHARGEBACK')),
 amount_cents bigint NOT NULL CHECK(amount_cents>0),currency char(3) NOT NULL DEFAULT 'USD',payment_method_id uuid NOT NULL REFERENCES user_payment_methods(id),stripe_customer_id text NOT NULL,
 stripe_payment_intent_id text UNIQUE,stripe_charge_id text,idempotency_key text NOT NULL UNIQUE,failure_code text,client_action_required boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),settled_at timestamptz,failed_at timestamptz,refunded_cents bigint NOT NULL DEFAULT 0 CHECK(refunded_cents>=0 AND refunded_cents<=amount_cents));
CREATE UNIQUE INDEX robot_funding_active_operation ON robot_funding_payments(user_id,purpose,idempotency_key);

CREATE TABLE unified_financial_ledger(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid,user_id uuid REFERENCES users(id),organization_id uuid REFERENCES organizations(id),contract_id uuid REFERENCES contracts(id),allocation_id uuid REFERENCES direct_ownership_allocations(id),
 purchase_order_id uuid REFERENCES robot_purchase_orders(id),robot_ownership_id uuid REFERENCES fractional_robot_ownership(id),transaction_type text NOT NULL CHECK(transaction_type IN('EXTERNAL_PAYMENT_PENDING','EXTERNAL_PAYMENT_SETTLED','EXTERNAL_PAYMENT_FAILED','DOWNPAYMENT_FUNDED','DOWNPAYMENT_RESERVED','DOWNPAYMENT_APPLIED','OWNERSHIP_PURCHASE','COMPANY_PAYMENT','COMPANY_INVOICE','OWNER_EARNING','OWNER_PAYOUT','MANUFACTURER_PAYABLE','MANUFACTURER_TRANSFER','PLATFORM_FEE','REFUND_PENDING','REFUND_SETTLED','DISPUTE_DEBIT','DISPUTE_CREDIT','MANUAL_ADJUSTMENT')),
 amount_cents bigint NOT NULL CHECK(amount_cents>=0),currency char(3) NOT NULL DEFAULT 'USD',direction text NOT NULL CHECK(direction IN('DEBIT','CREDIT')),status text NOT NULL,
 stripe_customer_id text,stripe_connected_account_id text,stripe_payment_intent_id text,stripe_charge_id text,stripe_invoice_id text,stripe_transfer_id text,stripe_payout_id text,stripe_refund_id text,stripe_dispute_id text,
 idempotency_key text NOT NULL UNIQUE,metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),settled_at timestamptz);
CREATE TRIGGER unified_financial_ledger_immutable BEFORE UPDATE OR DELETE ON unified_financial_ledger FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TABLE manufacturer_financial_profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),manufacturer_id uuid NOT NULL UNIQUE REFERENCES manufacturers(id),stripe_connected_account_id text UNIQUE,payouts_enabled boolean NOT NULL DEFAULT false,charges_enabled boolean NOT NULL DEFAULT false,bank_account_linked boolean NOT NULL DEFAULT false,verification_status text NOT NULL DEFAULT 'NOT_STARTED',requirements_due jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE manufacturer_payables(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),purchase_order_id uuid NOT NULL REFERENCES robot_purchase_orders(id),gross_amount_cents bigint NOT NULL CHECK(gross_amount_cents>0),platform_fee_cents bigint NOT NULL DEFAULT 0 CHECK(platform_fee_cents>=0),net_amount_cents bigint GENERATED ALWAYS AS(gross_amount_cents-platform_fee_cents) STORED,status text NOT NULL CHECK(status IN('PENDING','AVAILABLE','TRANSFER_PROCESSING','PAID','FAILED','HELD','CANCELLED')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(purchase_order_id));
CREATE TABLE manufacturer_transfers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payable_id uuid NOT NULL REFERENCES manufacturer_payables(id),manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),stripe_connected_account_id text NOT NULL,stripe_transfer_id text UNIQUE,amount_cents bigint NOT NULL CHECK(amount_cents>0),status text NOT NULL CHECK(status IN('CREATED','PROCESSING','SUCCEEDED','PAID','FAILED','REVERSED','UNKNOWN')),idempotency_key text NOT NULL UNIQUE,failure_code text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),paid_at timestamptz);

CREATE TABLE stripe_reconciliation_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reconciliation_run_id uuid REFERENCES payment_reconciliation_runs(id),stripe_transaction_id text,ledger_transaction_id uuid REFERENCES unified_financial_ledger(id),amount_cents bigint NOT NULL,currency char(3) NOT NULL DEFAULT 'USD',transaction_type text NOT NULL,status text NOT NULL CHECK(status IN('MATCHED','UNMATCHED_STRIPE','UNMATCHED_LEDGER','AMOUNT_MISMATCH','STATUS_MISMATCH','RESOLVED')),difference_cents bigint NOT NULL DEFAULT 0,resolution_notes text,created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,UNIQUE(reconciliation_run_id,stripe_transaction_id,ledger_transaction_id));

ALTER TABLE payment_processor_events ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE payment_processor_events ADD COLUMN IF NOT EXISTS failure_reason text;

INSERT INTO permission_definitions(permission_key,description) VALUES('financial.self.manage','Manage the authenticated user payment and payout profile'),('manufacturer.finance.manage','Manage manufacturer settlements') ON CONFLICT DO NOTHING;
