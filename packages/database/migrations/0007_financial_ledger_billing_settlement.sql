ALTER TABLE verified_operating_intervals
  ADD COLUMN financial_finalization_status text NOT NULL DEFAULT 'not_ready'
    CHECK(financial_finalization_status IN ('not_ready','ready','held','finalized','invalidated','superseded')),
  ADD COLUMN financial_finalized_at timestamptz,
  ADD COLUMN financial_finalized_by_user_id uuid REFERENCES users(id),
  ADD COLUMN financial_period_id uuid,
  ADD COLUMN financial_hold_count integer NOT NULL DEFAULT 0 CHECK(financial_hold_count>=0),
  ADD COLUMN financial_calculation_version integer CHECK(financial_calculation_version>0);

CREATE TABLE financial_periods(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),period_type text NOT NULL CHECK(period_type IN
    ('daily','weekly','semimonthly','monthly','custom')),period_start_at timestamptz NOT NULL,
  period_end_at timestamptz NOT NULL,timezone text NOT NULL,status text NOT NULL CHECK(status IN
    ('open','closing','closed','reopened','cancelled')),opened_at timestamptz NOT NULL,
  closing_started_at timestamptz,closed_at timestamptz,closed_by_user_id uuid REFERENCES users(id),
  reopened_at timestamptz,reopened_by_user_id uuid REFERENCES users(id),reopen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(period_end_at>period_start_at),UNIQUE(period_type,period_start_at,period_end_at,timezone)
);
ALTER TABLE verified_operating_intervals ADD CONSTRAINT verified_interval_financial_period_fk
  FOREIGN KEY(financial_period_id) REFERENCES financial_periods(id);

CREATE TABLE financial_accounts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_code text NOT NULL UNIQUE,account_name text NOT NULL,
  account_type text NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','expense',
    'contra_asset','contra_liability','contra_revenue')),owner_type text NOT NULL CHECK(owner_type IN
    ('platform','hiring_company','robot_owner','manufacturer','system')),owner_id uuid,currency text NOT NULL
    CHECK(currency='USD'),status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','restricted','closed')),
  normal_balance text NOT NULL CHECK(normal_balance IN ('debit','credit')),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journal_entries(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_number text NOT NULL UNIQUE,entry_type text NOT NULL,
  status text NOT NULL CHECK(status IN ('draft','posted','reversed','void')),effective_at timestamptz NOT NULL,
  financial_period_id uuid NOT NULL REFERENCES financial_periods(id),source_type text NOT NULL,source_id uuid NOT NULL,
  description text NOT NULL,currency text NOT NULL CHECK(currency='USD'),correlation_id uuid NOT NULL,
  reversal_of_entry_id uuid REFERENCES journal_entries(id),reversed_by_entry_id uuid REFERENCES journal_entries(id),
  posted_at timestamptz,posted_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE journal_lines(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_entry_id uuid NOT NULL REFERENCES journal_entries(id),
  financial_account_id uuid NOT NULL REFERENCES financial_accounts(id),line_number integer NOT NULL CHECK(line_number>0),
  debit_minor_units bigint NOT NULL DEFAULT 0 CHECK(debit_minor_units>=0),
  credit_minor_units bigint NOT NULL DEFAULT 0 CHECK(credit_minor_units>=0),description text NOT NULL,
  organization_id uuid REFERENCES organizations(id),robot_id uuid REFERENCES robots(id),
  contract_id uuid REFERENCES contracts(id),assignment_id uuid REFERENCES robot_assignments(id),
  verified_operating_interval_id uuid REFERENCES verified_operating_intervals(id),
  financial_configuration_version_id uuid REFERENCES financial_configuration_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(journal_entry_id,line_number),
  CHECK((debit_minor_units>0 AND credit_minor_units=0) OR (credit_minor_units>0 AND debit_minor_units=0))
);

CREATE OR REPLACE FUNCTION enforce_posted_journal_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE debit_total bigint;credit_total bigint;line_count integer;
BEGIN
  IF NEW.status='posted' AND OLD.status<>'posted' THEN
    SELECT COALESCE(SUM(debit_minor_units),0),COALESCE(SUM(credit_minor_units),0),COUNT(*)
      INTO debit_total,credit_total,line_count FROM journal_lines WHERE journal_entry_id=NEW.id;
    IF line_count<2 OR debit_total<>credit_total THEN RAISE EXCEPTION 'journal entry must balance and contain at least two lines'; END IF;
    NEW.posted_at=COALESCE(NEW.posted_at,now());
  END IF;RETURN NEW;
END;$$;
CREATE TRIGGER journal_balance_before_post BEFORE UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION enforce_posted_journal_balance();
CREATE OR REPLACE FUNCTION protect_posted_financial_records() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR OLD.status IN ('posted','issued','approved','ready_for_submission') THEN
    RAISE EXCEPTION 'posted or issued financial records are immutable';
  END IF;RETURN NEW;
END;$$;
CREATE TRIGGER posted_journal_immutable BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW WHEN(OLD.status='posted') EXECUTE FUNCTION protect_posted_financial_records();
CREATE OR REPLACE FUNCTION protect_posted_journal_lines() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF EXISTS(SELECT 1 FROM journal_entries WHERE id=OLD.journal_entry_id AND status='posted')
  THEN RAISE EXCEPTION 'posted journal lines are immutable';END IF;RETURN COALESCE(NEW,OLD);END;$$;
CREATE TRIGGER posted_journal_lines_immutable BEFORE UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION protect_posted_journal_lines();

CREATE TABLE financial_accruals(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),verified_operating_interval_id uuid NOT NULL
    REFERENCES verified_operating_intervals(id),financial_period_id uuid NOT NULL REFERENCES financial_periods(id),
  financial_configuration_version_id uuid NOT NULL REFERENCES financial_configuration_versions(id),
  calculation_version integer NOT NULL CHECK(calculation_version>0),robot_id uuid NOT NULL REFERENCES robots(id),
  robot_owner_organization_id uuid NOT NULL REFERENCES organizations(id),manufacturer_id uuid NOT NULL REFERENCES manufacturers(id),
  hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),contract_id uuid NOT NULL REFERENCES contracts(id),
  contract_version_id uuid NOT NULL REFERENCES contract_versions(id),assignment_id uuid NOT NULL REFERENCES robot_assignments(id),
  facility_id uuid NOT NULL REFERENCES facilities(id),department_id uuid REFERENCES departments(id),
  verified_duration_seconds integer NOT NULL CHECK(verified_duration_seconds>0),currency text NOT NULL CHECK(currency='USD'),
  company_base_charge_minor_units bigint NOT NULL CHECK(company_base_charge_minor_units>=0),
  company_platform_fee_minor_units bigint NOT NULL CHECK(company_platform_fee_minor_units>=0),
  company_total_charge_minor_units bigint NOT NULL CHECK(company_total_charge_minor_units>=0),
  owner_gross_earning_minor_units bigint NOT NULL CHECK(owner_gross_earning_minor_units>=0),
  owner_platform_fee_minor_units bigint NOT NULL CHECK(owner_platform_fee_minor_units>=0),
  owner_net_earning_minor_units bigint NOT NULL CHECK(owner_net_earning_minor_units>=0),
  platform_revenue_minor_units bigint NOT NULL CHECK(platform_revenue_minor_units>=0),
  rounding_adjustment_minor_units bigint NOT NULL DEFAULT 0,status text NOT NULL CHECK(status IN
    ('pending','posted','held','reversed','superseded')),journal_entry_id uuid REFERENCES journal_entries(id),
  supersedes_accrual_id uuid REFERENCES financial_accruals(id),superseded_by_accrual_id uuid REFERENCES financial_accruals(id),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(company_total_charge_minor_units=company_base_charge_minor_units+company_platform_fee_minor_units),
  CHECK(owner_net_earning_minor_units=owner_gross_earning_minor_units-owner_platform_fee_minor_units),
  CHECK(owner_gross_earning_minor_units=company_base_charge_minor_units),
  CHECK(platform_revenue_minor_units=company_platform_fee_minor_units+owner_platform_fee_minor_units+
    rounding_adjustment_minor_units),
  CHECK(company_total_charge_minor_units=owner_net_earning_minor_units+platform_revenue_minor_units)
);
CREATE UNIQUE INDEX financial_accrual_one_active ON financial_accruals(verified_operating_interval_id,calculation_version)
  WHERE status IN ('pending','posted','held');
CREATE TRIGGER posted_accrual_immutable BEFORE UPDATE OR DELETE ON financial_accruals
FOR EACH ROW WHEN(OLD.status='posted') EXECUTE FUNCTION protect_posted_financial_records();

CREATE TABLE company_billing_accounts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),hiring_company_id uuid NOT NULL UNIQUE REFERENCES hiring_companies(id),
  currency text NOT NULL CHECK(currency='USD'),billing_status text NOT NULL CHECK(billing_status IN
    ('not_configured','pending','active','past_due','restricted','suspended')),billing_frequency text NOT NULL CHECK
    (billing_frequency IN ('weekly','semimonthly','monthly','manual')),payment_terms_days integer NOT NULL CHECK(payment_terms_days>=0),
  invoice_delivery_method text NOT NULL,billing_contact_email text,purchase_order_required boolean NOT NULL DEFAULT false,
  default_purchase_order_reference text,credit_limit_minor_units bigint CHECK(credit_limit_minor_units>=0),
  current_outstanding_minor_units bigint NOT NULL DEFAULT 0 CHECK(current_outstanding_minor_units>=0),
  past_due_minor_units bigint NOT NULL DEFAULT 0 CHECK(past_due_minor_units>=0),
  financial_account_id uuid NOT NULL REFERENCES financial_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE company_invoices(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_number text UNIQUE,hiring_company_id uuid NOT NULL REFERENCES hiring_companies(id),
  billing_account_id uuid NOT NULL REFERENCES company_billing_accounts(id),financial_period_id uuid NOT NULL REFERENCES financial_periods(id),
  currency text NOT NULL CHECK(currency='USD'),status text NOT NULL CHECK(status IN ('draft','ready','issued',
    'partially_paid','paid','past_due','disputed','void','written_off')),issue_date date,
  service_period_start_at timestamptz NOT NULL,service_period_end_at timestamptz NOT NULL,due_date date,
  subtotal_minor_units bigint NOT NULL DEFAULT 0 CHECK(subtotal_minor_units>=0),platform_fee_minor_units bigint NOT NULL DEFAULT 0
    CHECK(platform_fee_minor_units>=0),credit_minor_units bigint NOT NULL DEFAULT 0 CHECK(credit_minor_units>=0),
  adjustment_minor_units bigint NOT NULL DEFAULT 0,total_minor_units bigint NOT NULL DEFAULT 0 CHECK(total_minor_units>=0),
  amount_paid_minor_units bigint NOT NULL DEFAULT 0 CHECK(amount_paid_minor_units>=0),
  amount_due_minor_units bigint NOT NULL DEFAULT 0 CHECK(amount_due_minor_units>=0),purchase_order_reference text,
  issued_at timestamptz,voided_at timestamptz,void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(service_period_end_at>service_period_start_at),CHECK(due_date IS NULL OR issue_date IS NULL OR due_date>=issue_date),
  CHECK(total_minor_units=subtotal_minor_units+platform_fee_minor_units-credit_minor_units+adjustment_minor_units),
  CHECK(amount_due_minor_units=total_minor_units-amount_paid_minor_units)
);
CREATE UNIQUE INDEX invoice_company_period_active ON company_invoices(hiring_company_id,financial_period_id,currency)
  WHERE status<>'void';
CREATE TABLE company_invoice_line_items(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL REFERENCES company_invoices(id),
  line_number integer NOT NULL CHECK(line_number>0),line_type text NOT NULL,description text NOT NULL,
  robot_id uuid REFERENCES robots(id),manufacturer_serial_number_snapshot text,contract_id uuid REFERENCES contracts(id),
  assignment_id uuid REFERENCES robot_assignments(id),facility_id uuid REFERENCES facilities(id),department_id uuid REFERENCES departments(id),
  service_date date NOT NULL,verified_duration_seconds integer NOT NULL DEFAULT 0 CHECK(verified_duration_seconds>=0),
  base_charge_minor_units bigint NOT NULL DEFAULT 0,platform_fee_minor_units bigint NOT NULL DEFAULT 0,
  line_total_minor_units bigint NOT NULL,financial_accrual_id uuid REFERENCES financial_accruals(id),
  credit_adjustment_id uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(invoice_id,line_number)
);
CREATE UNIQUE INDEX invoice_accrual_active_unique ON company_invoice_line_items(financial_accrual_id)
  WHERE financial_accrual_id IS NOT NULL;

CREATE TABLE robot_owner_earning_accounts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),robot_owner_organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id),
  currency text NOT NULL CHECK(currency='USD'),status text NOT NULL CHECK(status IN ('pending','active','restricted','suspended','closed')),
  financial_account_id uuid NOT NULL REFERENCES financial_accounts(id),accrued_minor_units bigint NOT NULL DEFAULT 0 CHECK(accrued_minor_units>=0),
  held_minor_units bigint NOT NULL DEFAULT 0 CHECK(held_minor_units>=0),available_for_future_payout_minor_units bigint NOT NULL DEFAULT 0
    CHECK(available_for_future_payout_minor_units>=0),paid_minor_units bigint NOT NULL DEFAULT 0 CHECK(paid_minor_units>=0),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE robot_owner_earnings_statements(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),statement_number text UNIQUE,robot_owner_organization_id uuid NOT NULL REFERENCES organizations(id),
  financial_period_id uuid NOT NULL REFERENCES financial_periods(id),currency text NOT NULL CHECK(currency='USD'),
  status text NOT NULL CHECK(status IN ('draft','ready','issued','adjusted','void')),period_start_at timestamptz NOT NULL,
  period_end_at timestamptz NOT NULL,gross_earning_minor_units bigint NOT NULL DEFAULT 0 CHECK(gross_earning_minor_units>=0),
  platform_fee_minor_units bigint NOT NULL DEFAULT 0 CHECK(platform_fee_minor_units>=0),net_earning_minor_units bigint NOT NULL DEFAULT 0
    CHECK(net_earning_minor_units>=0),held_minor_units bigint NOT NULL DEFAULT 0 CHECK(held_minor_units>=0),
  released_minor_units bigint NOT NULL DEFAULT 0 CHECK(released_minor_units>=0),paid_minor_units bigint NOT NULL DEFAULT 0
    CHECK(paid_minor_units>=0),created_at timestamptz NOT NULL DEFAULT now(),issued_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),CHECK(period_end_at>period_start_at),
  CHECK(net_earning_minor_units=gross_earning_minor_units-platform_fee_minor_units)
);
CREATE UNIQUE INDEX statement_owner_period_active ON robot_owner_earnings_statements(robot_owner_organization_id,
  financial_period_id,currency) WHERE status<>'void';
CREATE TABLE robot_owner_earnings_statement_lines(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),statement_id uuid NOT NULL REFERENCES robot_owner_earnings_statements(id),
  line_number integer NOT NULL CHECK(line_number>0),robot_id uuid NOT NULL REFERENCES robots(id),
  manufacturer_serial_number_snapshot text NOT NULL,contract_id uuid NOT NULL REFERENCES contracts(id),
  assignment_id uuid NOT NULL REFERENCES robot_assignments(id),service_date date NOT NULL,
  verified_duration_seconds integer NOT NULL CHECK(verified_duration_seconds>0),gross_earning_minor_units bigint NOT NULL CHECK(gross_earning_minor_units>=0),
  platform_fee_minor_units bigint NOT NULL CHECK(platform_fee_minor_units>=0),net_earning_minor_units bigint NOT NULL CHECK(net_earning_minor_units>=0),
  hold_status text NOT NULL,financial_accrual_id uuid NOT NULL REFERENCES financial_accruals(id),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(statement_id,line_number),UNIQUE(financial_accrual_id)
);

CREATE TABLE financial_holds(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),hold_scope text NOT NULL,scope_id uuid NOT NULL,
  organization_id uuid REFERENCES organizations(id),financial_accrual_id uuid REFERENCES financial_accruals(id),
  invoice_id uuid REFERENCES company_invoices(id),statement_id uuid REFERENCES robot_owner_earnings_statements(id),
  hold_type text NOT NULL,status text NOT NULL CHECK(status IN ('active','released','confirmed_invalid','superseded')),
  amount_minor_units bigint NOT NULL CHECK(amount_minor_units>=0),currency text NOT NULL CHECK(currency='USD'),
  reason text NOT NULL,placed_by_user_id uuid REFERENCES users(id),placed_by_system boolean NOT NULL DEFAULT false,
  placed_at timestamptz NOT NULL,released_at timestamptz,released_by_user_id uuid REFERENCES users(id),
  resolution text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX financial_hold_active_unique ON financial_holds(hold_scope,scope_id,hold_type) WHERE status='active';
CREATE TABLE financial_adjustments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),adjustment_number text NOT NULL UNIQUE,adjustment_type text NOT NULL,
  status text NOT NULL CHECK(status IN ('draft','pending_approval','approved','posted','rejected','reversed')),
  currency text NOT NULL CHECK(currency='USD'),amount_minor_units bigint NOT NULL CHECK(amount_minor_units>0),
  hiring_company_id uuid REFERENCES hiring_companies(id),robot_owner_organization_id uuid REFERENCES organizations(id),
  contract_id uuid REFERENCES contracts(id),assignment_id uuid REFERENCES robot_assignments(id),robot_id uuid REFERENCES robots(id),
  financial_accrual_id uuid REFERENCES financial_accruals(id),invoice_id uuid REFERENCES company_invoices(id),
  statement_id uuid REFERENCES robot_owner_earnings_statements(id),reason_code text NOT NULL,reason text NOT NULL,
  requested_by_user_id uuid NOT NULL REFERENCES users(id),approved_by_user_id uuid REFERENCES users(id),
  effective_at timestamptz,journal_entry_id uuid REFERENCES journal_entries(id),
  reversal_of_adjustment_id uuid REFERENCES financial_adjustments(id),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(approved_by_user_id IS NULL OR approved_by_user_id<>requested_by_user_id)
);
CREATE TABLE financial_disputes(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dispute_type text NOT NULL,status text NOT NULL,
  opened_by_user_id uuid NOT NULL REFERENCES users(id),opened_by_organization_id uuid NOT NULL REFERENCES organizations(id),
  hiring_company_id uuid REFERENCES hiring_companies(id),robot_owner_organization_id uuid REFERENCES organizations(id),
  invoice_id uuid REFERENCES company_invoices(id),statement_id uuid REFERENCES robot_owner_earnings_statements(id),
  financial_accrual_id uuid REFERENCES financial_accruals(id),operating_interval_id uuid REFERENCES verified_operating_intervals(id),
  amount_disputed_minor_units bigint NOT NULL CHECK(amount_disputed_minor_units>0),currency text NOT NULL CHECK(currency='USD'),
  reason_code text NOT NULL,description text NOT NULL,opened_at timestamptz NOT NULL,response_due_at timestamptz,
  resolved_at timestamptz,resolved_by_user_id uuid REFERENCES users(id),resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settlement_batches(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),batch_number text NOT NULL UNIQUE,batch_type text NOT NULL CHECK(batch_type IN
    ('company_collection','owner_payout','refund','manual_adjustment')),currency text NOT NULL CHECK(currency='USD'),
  status text NOT NULL CHECK(status IN ('draft','prepared','pending_approval','approved','ready_for_submission','cancelled')),
  financial_period_id uuid REFERENCES financial_periods(id),scheduled_settlement_date date,total_item_count integer NOT NULL DEFAULT 0,
  total_amount_minor_units bigint NOT NULL DEFAULT 0 CHECK(total_amount_minor_units>=0),prepared_at timestamptz,
  prepared_by_user_id uuid REFERENCES users(id),approved_at timestamptz,approved_by_user_id uuid REFERENCES users(id),
  submitted_at timestamptz,completed_at timestamptz,failed_at timestamptz,failure_reason text,
  external_processor text,external_batch_reference text,created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),CHECK(submitted_at IS NULL AND completed_at IS NULL)
);
CREATE TABLE settlement_batch_items(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),settlement_batch_id uuid NOT NULL REFERENCES settlement_batches(id),
  item_type text NOT NULL,organization_id uuid NOT NULL REFERENCES organizations(id),invoice_id uuid REFERENCES company_invoices(id),
  statement_id uuid REFERENCES robot_owner_earnings_statements(id),financial_account_id uuid NOT NULL REFERENCES financial_accounts(id),
  amount_minor_units bigint NOT NULL CHECK(amount_minor_units>0),currency text NOT NULL CHECK(currency='USD'),
  status text NOT NULL CHECK(status IN ('pending','held','ready','cancelled')),hold_reason text,external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX settlement_invoice_active_unique ON settlement_batch_items(invoice_id) WHERE invoice_id IS NOT NULL AND status<>'cancelled';
CREATE UNIQUE INDEX settlement_statement_active_unique ON settlement_batch_items(statement_id) WHERE statement_id IS NOT NULL AND status<>'cancelled';

CREATE TABLE financial_reconciliation_runs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reconciliation_type text NOT NULL,status text NOT NULL,
  period_start_at timestamptz NOT NULL,period_end_at timestamptz NOT NULL,started_at timestamptz NOT NULL,
  completed_at timestamptz,started_by_user_id uuid REFERENCES users(id),record_count integer NOT NULL DEFAULT 0,
  exception_count integer NOT NULL DEFAULT 0,summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(period_end_at>period_start_at)
);
CREATE TABLE financial_reconciliation_exceptions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reconciliation_run_id uuid NOT NULL REFERENCES financial_reconciliation_runs(id),
  exception_type text NOT NULL,severity text NOT NULL CHECK(severity IN ('informational','low','medium','high','critical')),
  resource_type text NOT NULL,resource_id uuid,expected_value jsonb,actual_value jsonb,
  difference_minor_units bigint,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  resolution text,resolved_by_user_id uuid REFERENCES users(id),resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO financial_accounts(account_code,account_name,account_type,owner_type,currency,status,normal_balance) VALUES
('1000','Company Accounts Receivable','asset','platform','USD','active','debit'),
('1010','Cash Clearing — Future','asset','platform','USD','active','debit'),
('1020','Payment Processor Clearing — Future','asset','platform','USD','active','debit'),
('2000','Robot Owner Payables','liability','platform','USD','active','credit'),
('2010','Company Customer Credits','liability','platform','USD','active','credit'),
('2020','Settlement Suspense','liability','platform','USD','active','credit'),
('2030','Financial Review Holds','liability','platform','USD','active','credit'),
('4000','Hiring Company Platform Fee Revenue','revenue','platform','USD','active','credit'),
('4010','Robot Owner Platform Fee Revenue','revenue','platform','USD','active','credit'),
('4020','Rounding Adjustment Revenue','revenue','platform','USD','active','credit'),
('4030','Reversal and Adjustment Clearing','revenue','platform','USD','active','credit'),
('5000','Payment Processing Expense — Future','expense','platform','USD','active','debit'),
('5010','Owner Payout Processing Expense — Future','expense','platform','USD','active','debit')
ON CONFLICT(account_code) DO NOTHING;

CREATE TRIGGER issued_invoice_immutable BEFORE UPDATE OR DELETE ON company_invoices
FOR EACH ROW WHEN(OLD.status='issued') EXECUTE FUNCTION protect_posted_financial_records();
CREATE TRIGGER issued_statement_immutable BEFORE UPDATE OR DELETE ON robot_owner_earnings_statements
FOR EACH ROW WHEN(OLD.status='issued') EXECUTE FUNCTION protect_posted_financial_records();
ALTER TABLE company_invoice_line_items ADD CONSTRAINT invoice_line_credit_adjustment_fk
  FOREIGN KEY(credit_adjustment_id) REFERENCES financial_adjustments(id);