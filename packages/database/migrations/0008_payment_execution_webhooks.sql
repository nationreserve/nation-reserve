ALTER TABLE company_billing_accounts ADD COLUMN collection_method text NOT NULL DEFAULT 'manual'
  CHECK(collection_method IN ('automatic','manual'));
ALTER TABLE company_billing_accounts ADD COLUMN automatic_collection_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE company_billing_accounts ADD COLUMN automatic_collection_day_offset integer NOT NULL DEFAULT 0;
ALTER TABLE company_billing_accounts ADD COLUMN payment_retry_policy jsonb NOT NULL DEFAULT '{}';
ALTER TABLE company_billing_accounts ADD COLUMN last_successful_payment_at timestamptz;
ALTER TABLE company_billing_accounts ADD COLUMN last_failed_payment_at timestamptz;

CREATE TABLE payment_provider_customers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),
 organization_id uuid NOT NULL REFERENCES organizations(id),organization_type text NOT NULL CHECK(organization_type='hiring_company'),
 provider_customer_id text NOT NULL,status text NOT NULL CHECK(status IN('pending','active','restricted','deleted')),
 default_payment_method_id uuid,email_snapshot text,name_snapshot text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(provider,provider_environment,organization_id),
 UNIQUE(provider,provider_environment,provider_customer_id));
CREATE TABLE company_payment_methods(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),
 billing_account_id uuid NOT NULL REFERENCES company_billing_accounts(id),provider text NOT NULL,
 provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),provider_customer_id text NOT NULL,
 provider_payment_method_id text NOT NULL,payment_method_type text NOT NULL CHECK(payment_method_type IN('card','us_bank_account')),
 display_brand text,display_last4 text CHECK(display_last4 IS NULL OR length(display_last4)=4),expiration_month integer,
 expiration_year integer,bank_name_display text,status text NOT NULL CHECK(status IN('pending','active','requires_action',
 'verification_pending','failed','expired','removed')),is_default boolean NOT NULL DEFAULT false,
 verification_status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 removed_at timestamptz,UNIQUE(provider,provider_environment,provider_payment_method_id));
CREATE UNIQUE INDEX company_payment_method_default_unique ON company_payment_methods(billing_account_id)
 WHERE is_default AND status='active';
ALTER TABLE payment_provider_customers ADD CONSTRAINT provider_customer_default_method_fk
 FOREIGN KEY(default_payment_method_id) REFERENCES company_payment_methods(id);

CREATE TABLE payment_provider_connected_accounts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),robot_owner_organization_id uuid NOT NULL REFERENCES organizations(id),
 provider text NOT NULL,provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),
 provider_account_id text NOT NULL,account_type text NOT NULL,status text NOT NULL CHECK(status IN('not_started',
 'onboarding','pending_verification','restricted','active','disabled','closed')),details_submitted boolean NOT NULL DEFAULT false,
 charges_enabled boolean NOT NULL DEFAULT false,transfers_enabled boolean NOT NULL DEFAULT false,
 payouts_enabled boolean NOT NULL DEFAULT false,requirements_currently_due jsonb NOT NULL DEFAULT '[]',
 requirements_eventually_due jsonb NOT NULL DEFAULT '[]',disabled_reason text,country_code text NOT NULL,
 default_currency text NOT NULL CHECK(default_currency='USD'),last_synced_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_environment,robot_owner_organization_id),UNIQUE(provider,provider_environment,provider_account_id));

CREATE TABLE payment_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_number text NOT NULL UNIQUE,provider text NOT NULL,
 provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),attempt_type text NOT NULL,
 status text NOT NULL CHECK(status IN('created','submitted','requires_action','processing','authorized','succeeded',
 'settled','failed','cancelled','unknown','refunded','partially_refunded','disputed')),
 hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),billing_account_id uuid NOT NULL REFERENCES company_billing_accounts(id),
 invoice_id uuid NOT NULL REFERENCES company_invoices(id),settlement_batch_id uuid REFERENCES settlement_batches(id),
 settlement_batch_item_id uuid REFERENCES settlement_batch_items(id),payment_method_id uuid NOT NULL REFERENCES company_payment_methods(id),
 currency text NOT NULL CHECK(currency='USD'),amount_minor_units bigint NOT NULL CHECK(amount_minor_units>0),
 idempotency_key text NOT NULL,provider_customer_id text NOT NULL,provider_payment_intent_id text,
 provider_charge_id text,provider_balance_transaction_id text,requires_action boolean NOT NULL DEFAULT false,
 failure_code text,failure_message_safe text,attempt_count integer NOT NULL DEFAULT 1 CHECK(attempt_count>0),
 initiated_at timestamptz NOT NULL,authorized_at timestamptz,succeeded_at timestamptz,settled_at timestamptz,
 cancelled_at timestamptz,failed_at timestamptz,settlement_journal_entry_id uuid REFERENCES journal_entries(id),
 next_retry_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_environment,idempotency_key),UNIQUE(provider,provider_environment,provider_payment_intent_id),
 UNIQUE(provider,provider_environment,provider_charge_id));
CREATE UNIQUE INDEX payment_attempt_invoice_active ON payment_attempts(invoice_id)
 WHERE status IN('created','submitted','requires_action','processing','authorized','succeeded');

CREATE TABLE payout_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_number text NOT NULL UNIQUE,provider text NOT NULL,
 provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),status text NOT NULL CHECK(status IN
 ('created','submitted','processing','succeeded','paid','failed','cancelled','unknown','reversed')),
 robot_owner_organization_id uuid NOT NULL REFERENCES organizations(id),connected_account_id uuid NOT NULL
 REFERENCES payment_provider_connected_accounts(id),statement_id uuid REFERENCES robot_owner_earnings_statements(id),
 settlement_batch_id uuid REFERENCES settlement_batches(id),settlement_batch_item_id uuid REFERENCES settlement_batch_items(id),
 currency text NOT NULL CHECK(currency='USD'),amount_minor_units bigint NOT NULL CHECK(amount_minor_units>0),
 idempotency_key text NOT NULL,provider_transfer_id text,provider_payout_id text,provider_balance_transaction_id text,
 failure_code text,failure_message_safe text,attempt_count integer NOT NULL DEFAULT 1,initiated_at timestamptz NOT NULL,
 succeeded_at timestamptz,paid_at timestamptz,failed_at timestamptz,settlement_journal_entry_id uuid REFERENCES journal_entries(id),
 next_retry_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_environment,idempotency_key),UNIQUE(provider,provider_environment,provider_transfer_id),
 UNIQUE(provider,provider_environment,provider_payout_id));
CREATE UNIQUE INDEX payout_statement_active ON payout_attempts(statement_id)
 WHERE status IN('created','submitted','processing','succeeded');

CREATE TABLE payment_refunds(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),refund_number text NOT NULL UNIQUE,provider text NOT NULL,
 provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),payment_attempt_id uuid NOT NULL REFERENCES payment_attempts(id),
 invoice_id uuid NOT NULL REFERENCES company_invoices(id),financial_adjustment_id uuid REFERENCES financial_adjustments(id),
 amount_minor_units bigint NOT NULL CHECK(amount_minor_units>0),currency text NOT NULL CHECK(currency='USD'),
 status text NOT NULL CHECK(status IN('created','submitted','processing','succeeded','failed','cancelled','unknown')),
 idempotency_key text NOT NULL,provider_refund_id text,failure_code text,failure_message_safe text,initiated_at timestamptz NOT NULL,
 succeeded_at timestamptz,failed_at timestamptz,settlement_journal_entry_id uuid REFERENCES journal_entries(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_environment,idempotency_key),UNIQUE(provider,provider_environment,provider_refund_id));

CREATE TABLE processor_disputes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),
 provider_dispute_id text NOT NULL,payment_attempt_id uuid REFERENCES payment_attempts(id),invoice_id uuid REFERENCES company_invoices(id),
 status text NOT NULL,amount_minor_units bigint NOT NULL CHECK(amount_minor_units>0),currency text NOT NULL CHECK(currency='USD'),
 reason text,evidence_due_at timestamptz,created_by_provider_at timestamptz NOT NULL,resolved_at timestamptz,
 outcome text,suspense_journal_entry_id uuid REFERENCES journal_entries(id),created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(provider,provider_environment,provider_dispute_id));

CREATE TABLE payment_processor_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),
 provider_event_id text NOT NULL,event_type text NOT NULL,provider_object_id text,created_by_provider_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL,processing_status text NOT NULL CHECK(processing_status IN('received','processing','processed','ignored','failed')),
 payload_hash text NOT NULL,signature_verified boolean NOT NULL,attempt_count integer NOT NULL DEFAULT 0,
 processed_at timestamptz,failure_code text,failure_message_safe text,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(provider,provider_environment,provider_event_id));

CREATE TABLE processor_balance_transactions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,provider_environment text NOT NULL CHECK(provider_environment IN('test','live')),
 provider_balance_transaction_id text NOT NULL,transaction_type text NOT NULL,source_provider_object_id text,
 amount_minor_units bigint NOT NULL,fee_minor_units bigint NOT NULL DEFAULT 0 CHECK(fee_minor_units>=0),
 net_minor_units bigint NOT NULL,currency text NOT NULL CHECK(currency='USD'),available_at timestamptz,
 settlement_journal_entry_id uuid REFERENCES journal_entries(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_environment,provider_balance_transaction_id),CHECK(net_minor_units=amount_minor_units-fee_minor_units));

CREATE TABLE payment_reconciliation_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,provider_environment text NOT NULL,
 status text NOT NULL,started_at timestamptz NOT NULL,completed_at timestamptz,record_count integer NOT NULL DEFAULT 0,
 exception_count integer NOT NULL DEFAULT 0,summary jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now());

INSERT INTO financial_accounts(account_code,account_name,account_type,owner_type,currency,status,normal_balance)
VALUES('5020','Processor Fees','expense','platform','USD','active','debit'),
('2040','Chargeback Suspense','liability','platform','USD','active','credit')
ON CONFLICT(account_code) DO NOTHING;
