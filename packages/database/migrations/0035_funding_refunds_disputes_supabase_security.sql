CREATE TABLE robot_funding_refunds(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),funding_payment_id uuid NOT NULL REFERENCES robot_funding_payments(id),user_id uuid NOT NULL REFERENCES users(id),
 amount_cents bigint NOT NULL CHECK(amount_cents>0),status text NOT NULL CHECK(status IN('REQUESTED','PROCESSING','SUCCEEDED','FAILED','CANCELLED','UNKNOWN')),
 reason text NOT NULL,stripe_refund_id text UNIQUE,idempotency_key text NOT NULL UNIQUE,failure_code text,requested_by_user_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),settled_at timestamptz,failed_at timestamptz);
CREATE TABLE robot_funding_disputes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),funding_payment_id uuid NOT NULL REFERENCES robot_funding_payments(id),user_id uuid NOT NULL REFERENCES users(id),allocation_id uuid REFERENCES direct_ownership_allocations(id),
 stripe_dispute_id text NOT NULL UNIQUE,status text NOT NULL CHECK(status IN('DISPUTE_OPENED','FUNDS_WITHDRAWN','DISPUTE_WON','DISPUTE_LOST','CHARGEBACK','RECOVERY_REQUIRED')),
 amount_cents bigint NOT NULL CHECK(amount_cents>0),reason text,ownership_review_required boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz);

ALTER TABLE direct_ownership_allocations ADD COLUMN IF NOT EXISTS financial_review_required boolean NOT NULL DEFAULT false;
ALTER TABLE fractional_robot_ownership ADD COLUMN IF NOT EXISTS financial_review_required boolean NOT NULL DEFAULT false;

-- Supabase/direct-client safety: financial tables are backend-only. Service-role/database-owner connections bypass RLS;
-- no anonymous/authenticated client policy is intentionally granted.
ALTER TABLE user_financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE robot_funding_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE robot_funding_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE robot_funding_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_reconciliation_items ENABLE ROW LEVEL SECURITY;

-- Supabase Storage is optional. When its schema exists, create private buckets; no public object policy is added.
DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
   ('training-data-private','training-data-private',false,5368709120,ARRAY['video/mp4','video/quicktime','application/octet-stream','application/json']),
   ('manufacturer-documents-private','manufacturer-documents-private',false,104857600,ARRAY['application/pdf','application/octet-stream']),
   ('contract-documents-private','contract-documents-private',false,104857600,ARRAY['application/pdf','application/octet-stream'])
  ON CONFLICT(id) DO UPDATE SET public=false;
 END IF;
END $$;
