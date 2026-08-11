CREATE OR REPLACE FUNCTION recalculate_contract_capacity(p_contract_id uuid,p_actor_user_id uuid DEFAULT NULL)
RETURNS contract_capacity_snapshots LANGUAGE plpgsql AS $$
DECLARE v_contract contracts%ROWTYPE;v_version contract_versions%ROWTYPE;v_capacity integer:=0;v_owned integer:=0;v_ordered integer:=0;v_reserved integer:=0;v_pending integer:=0;v_row contract_capacity_snapshots%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_contract_id::text,0));
 SELECT * INTO v_contract FROM contracts WHERE id=p_contract_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND';END IF;
 SELECT * INTO v_version FROM contract_versions WHERE contract_id=p_contract_id AND version_number=v_contract.current_version_number;
 WITH dates AS(SELECT generate_series(v_contract.start_at::date,LEAST(COALESCE(v_contract.end_at::date,v_contract.start_at::date+366),v_contract.start_at::date+366),interval '1 day')::date d),
 windows AS(SELECT ((d.d+r.local_start_time) AT TIME ZONE r.timezone) start_at,((d.d+CASE WHEN r.local_end_time<=r.local_start_time THEN 1 ELSE 0 END+r.local_end_time) AT TIME ZONE r.timezone) end_at,COALESCE(r.required_robot_count,v_version.requested_robot_count) robots FROM dates d JOIN contract_schedule_rules r ON r.contract_version_id=v_version.id AND extract(dow FROM d.d)=r.day_of_week AND d.d>=r.recurrence_start AND (r.recurrence_end IS NULL OR d.d<=r.recurrence_end) WHERE NOT EXISTS(SELECT 1 FROM contract_schedule_exceptions e WHERE e.contract_version_id=v_version.id AND e.exception_date=d.d AND e.exception_type IN('holiday','blackout')) UNION ALL SELECT ((e.exception_date+e.local_start_time) AT TIME ZONE COALESCE(r.timezone,'UTC')),((e.exception_date+CASE WHEN e.local_end_time<=e.local_start_time THEN 1 ELSE 0 END+e.local_end_time) AT TIME ZONE COALESCE(r.timezone,'UTC')),COALESCE(r.required_robot_count,v_version.requested_robot_count) FROM contract_schedule_exceptions e LEFT JOIN LATERAL(SELECT * FROM contract_schedule_rules rr WHERE rr.contract_version_id=e.contract_version_id LIMIT 1)r ON true WHERE e.contract_version_id=v_version.id AND e.exception_type='override'),
 events AS(SELECT start_at at,robots delta FROM windows UNION ALL SELECT end_at,-robots FROM windows),running AS(SELECT SUM(delta)OVER(ORDER BY at,delta ROWS UNBOUNDED PRECEDING) active FROM events)
 SELECT COALESCE(MAX(active),v_version.requested_robot_count,0)::integer INTO v_capacity FROM running;
 SELECT COUNT(DISTINCT robot_id)::integer INTO v_owned FROM robot_assignments WHERE contract_id=p_contract_id AND status IN('reserved','ready','scheduled','active','paused','interrupted');
 SELECT COALESCE(SUM(quantity)FILTER(WHERE status IN('submitted','approved','manufacturer_accepted')),0)::integer,COALESCE(SUM(quantity)FILTER(WHERE status='pending_fulfillment'),0)::integer INTO v_ordered,v_pending FROM robot_purchase_orders WHERE contract_id=p_contract_id;
 SELECT COALESCE(CEIL(SUM(allocated_microunits)::numeric/1000000),0)::integer INTO v_reserved FROM direct_ownership_allocations WHERE contract_id=p_contract_id AND status IN('PAYMENT_WINDOW_OPEN','PAYMENT_PROCESSING','PAID');
 INSERT INTO contract_capacity_snapshots(contract_id,schedule_revision_id,normal_concurrent_capacity,owned_assigned,ordered,reserved,pending_fulfillment,calculation,created_by_user_id) VALUES(p_contract_id,v_version.id,v_capacity,v_owned,v_ordered,v_reserved,v_pending,jsonb_build_object('timezoneAware',true,'daylightSavingAware',true,'windowStart',v_contract.start_at,'windowEnd',v_contract.end_at,'contractVersion',v_contract.current_version_number),p_actor_user_id) RETURNING * INTO v_row;
 UPDATE robot_purchase_orders SET status='CAPACITY_REVIEW_REQUIRED',version=version+1,updated_at=now() WHERE contract_id=p_contract_id AND status IN('submitted','approved','manufacturer_accepted','pending_fulfillment') AND quantity>v_row.remaining_capacity;
 RETURN v_row;
END $$;

CREATE TABLE direct_allocation_payment_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),allocation_id uuid NOT NULL REFERENCES direct_ownership_allocations(id),participant_id uuid NOT NULL REFERENCES users(id),
 source text NOT NULL CHECK(source IN('DOWNPAYMENT_BALANCE','PAYMENT_PROVIDER')),status text NOT NULL CHECK(status IN('CREATED','PROCESSING','REQUIRES_ACTION','SUCCEEDED','FAILED','EXPIRED','CANCELLED','UNKNOWN')),
 amount_cents bigint NOT NULL CHECK(amount_cents>0),provider text,provider_environment text,provider_object_id text,client_secret_ciphertext text,
 idempotency_key text NOT NULL UNIQUE,failure_code text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz);
CREATE UNIQUE INDEX direct_allocation_payment_active ON direct_allocation_payment_attempts(allocation_id) WHERE status IN('CREATED','PROCESSING','REQUIRES_ACTION','SUCCEEDED','UNKNOWN');

CREATE TABLE allocation_reminder_deliveries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),allocation_id uuid NOT NULL REFERENCES direct_ownership_allocations(id),reminder_type text NOT NULL CHECK(reminder_type IN('WINDOW_OPEN','THREE_DAYS','TWENTY_FOUR_HOURS','ONE_HOUR','EXPIRED','SUCCEEDED')),
 scheduled_for timestamptz NOT NULL,status text NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','ENQUEUED','DELIVERED','FAILED','CANCELLED')),idempotency_key text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),delivered_at timestamptz);

CREATE TABLE marketplace_link_checks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid NOT NULL REFERENCES wearable_catalog_products(id),status text NOT NULL CHECK(status IN('PENDING','HEALTHY','BROKEN','BLOCKED','FAILED')),http_status integer,checked_at timestamptz NOT NULL DEFAULT now(),failure_reason text);

CREATE OR REPLACE FUNCTION prohibit_new_legacy_tickets() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LEGACY_TICKET_CREATION_DISABLED';END $$;
DO $$ BEGIN IF to_regclass('public.queue_tickets') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='queue_tickets_no_new_records') THEN EXECUTE 'CREATE TRIGGER queue_tickets_no_new_records BEFORE INSERT ON queue_tickets FOR EACH ROW EXECUTE FUNCTION prohibit_new_legacy_tickets()';END IF;END $$;
