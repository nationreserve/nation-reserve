-- Superseding contract-capacity, dollar funding, human training data, and wearable marketplace model.
CREATE TYPE ownership_allocation_status AS ENUM ('PENDING_PRICE','PAYMENT_WINDOW_OPEN','PAYMENT_PROCESSING','PAID','EXPIRED_UNPAID','QUEUE_REPLACEMENT_PENDING','QUEUE_REPLACEMENT_COMPLETE','CANCELLED');
CREATE TYPE wearable_approval_status AS ENUM ('UNREVIEWED','DATA_ACCESS_REVIEWED','PROJECT_COMPATIBLE','APPROVED_FOR_SPECIFIC_PROJECTS','REJECTED','DISCONTINUED');
CREATE TYPE training_project_status AS ENUM ('DRAFT','RECRUITING','READY_FOR_RECORDING','RECORDING','UPLOADING','PROCESSING','AWAITING_REVIEW','CHANGES_REQUESTED','APPROVED','PARTIALLY_APPROVED','REJECTED','ARCHIVED');

ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_ci_unique ON users(lower(username)) WHERE username IS NOT NULL;

CREATE TABLE contract_capacity_snapshots(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES contracts(id), schedule_revision_id uuid,
 normal_concurrent_capacity integer NOT NULL CHECK(normal_concurrent_capacity>=0), owned_assigned integer NOT NULL DEFAULT 0 CHECK(owned_assigned>=0),
 ordered integer NOT NULL DEFAULT 0 CHECK(ordered>=0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0), pending_fulfillment integer NOT NULL DEFAULT 0 CHECK(pending_fulfillment>=0),
 remaining_capacity integer GENERATED ALWAYS AS (greatest(0,normal_concurrent_capacity-owned_assigned-ordered-reserved-pending_fulfillment)) STORED,
 calculated_at timestamptz NOT NULL DEFAULT now(), calculation jsonb NOT NULL, created_by_user_id uuid REFERENCES users(id));
CREATE INDEX contract_capacity_latest_idx ON contract_capacity_snapshots(contract_id,calculated_at DESC);

CREATE TABLE purchase_limit_acknowledgments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), organization_id uuid NOT NULL REFERENCES organizations(id), contract_id uuid NOT NULL REFERENCES contracts(id),
 purchase_order_id uuid, guideline_version text NOT NULL, calculated_capacity integer NOT NULL, committed_robot_count integer NOT NULL, available_robot_count integer NOT NULL,
 requested_quantity integer NOT NULL CHECK(requested_quantity>0), acknowledged_at timestamptz NOT NULL DEFAULT now(), request_metadata jsonb NOT NULL DEFAULT '{}');

CREATE TABLE direct_ownership_allocations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES contracts(id), assigned_user_id uuid NOT NULL REFERENCES users(id), assigned_by_user_id uuid NOT NULL REFERENCES users(id),
 status ownership_allocation_status NOT NULL DEFAULT 'PENDING_PRICE', allocated_microunits bigint NOT NULL CHECK(allocated_microunits>0), locked_unit_price_cents bigint CHECK(locked_unit_price_cents>0),
 price_locked_at timestamptz, price_locked_by uuid REFERENCES users(id), payment_window_started_at timestamptz, payment_due_at timestamptz,
 reserved_amount_cents bigint NOT NULL DEFAULT 0 CHECK(reserved_amount_cents>=0), paid_amount_cents bigint NOT NULL DEFAULT 0 CHECK(paid_amount_cents>=0),
 idempotency_key text NOT NULL UNIQUE, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(contract_id,assigned_user_id), CHECK((payment_due_at IS NULL AND payment_window_started_at IS NULL) OR payment_due_at=payment_window_started_at+interval '7 days'));

CREATE TABLE downpayment_accounts(
 participant_id uuid PRIMARY KEY REFERENCES users(id), contributed_cents bigint NOT NULL DEFAULT 0, available_cents bigint NOT NULL DEFAULT 0, reserved_cents bigint NOT NULL DEFAULT 0,
 applied_cents bigint NOT NULL DEFAULT 0, refunded_cents bigint NOT NULL DEFAULT 0, adjustment_cents bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(), CHECK(contributed_cents=available_cents+reserved_cents+applied_cents+refunded_cents+adjustment_cents));
CREATE TABLE downpayment_queue_entries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), participant_id uuid NOT NULL REFERENCES users(id), priority bigint GENERATED ALWAYS AS IDENTITY,
 status text NOT NULL DEFAULT 'available', created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz);
CREATE INDEX downpayment_queue_order_idx ON downpayment_queue_entries(priority,id) WHERE closed_at IS NULL;
CREATE TABLE fractional_robot_ownership(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), participant_id uuid NOT NULL REFERENCES users(id), contract_id uuid NOT NULL REFERENCES contracts(id), robot_id uuid REFERENCES robots(id),
 ownership_microunits bigint NOT NULL CHECK(ownership_microunits>0 AND ownership_microunits<=20000000), applied_amount_cents bigint NOT NULL CHECK(applied_amount_cents>0),
 source_queue_entry_id uuid REFERENCES downpayment_queue_entries(id), source_allocation_id uuid REFERENCES direct_ownership_allocations(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ownership_contract_cap_idx ON fractional_robot_ownership(participant_id,contract_id);

CREATE TABLE training_projects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), manufacturer_id uuid REFERENCES organizations(id), robot_model_id uuid REFERENCES robot_models(id),
 title text NOT NULL, task_description text NOT NULL, task_category text NOT NULL, work_environment text NOT NULL, required_wearable_tier smallint NOT NULL CHECK(required_wearable_tier BETWEEN 1 AND 3),
 required_devices jsonb NOT NULL DEFAULT '[]', required_sensor_streams jsonb NOT NULL DEFAULT '[]', capture_requirements jsonb NOT NULL DEFAULT '{}', safety_requirements jsonb NOT NULL DEFAULT '{}',
 consent_requirements jsonb NOT NULL DEFAULT '{}', privacy_requirements jsonb NOT NULL DEFAULT '{}', retention_policy jsonb NOT NULL, target_recording_minutes integer NOT NULL,
 target_approved_minutes integer NOT NULL, compensation_model text NOT NULL CHECK(compensation_model IN ('PER_APPROVED_MINUTE','PER_APPROVED_SESSION','PER_COMPLETED_TASK','FIXED_PROJECT_AMOUNT','HOURLY_APPROVED_RECORDING')),
 compensation_rate_cents bigint NOT NULL CHECK(compensation_rate_cents>=0), review_rules jsonb NOT NULL DEFAULT '{}', status training_project_status NOT NULL DEFAULT 'DRAFT', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE training_sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES training_projects(id), participant_id uuid NOT NULL REFERENCES users(id), supervisor_id uuid REFERENCES users(id), wearable_kit_id uuid,
 started_at timestamptz, ended_at timestamptz, raw_duration_seconds integer NOT NULL DEFAULT 0, submitted_duration_seconds integer NOT NULL DEFAULT 0, approved_duration_seconds integer NOT NULL DEFAULT 0,
 rejected_duration_seconds integer NOT NULL DEFAULT 0, task_attempt_count integer NOT NULL DEFAULT 0, environment_metadata jsonb NOT NULL DEFAULT '{}', device_metadata jsonb NOT NULL DEFAULT '{}',
 consent_version text NOT NULL, consent_accepted_at timestamptz NOT NULL, privacy_review_status text NOT NULL DEFAULT 'pending', quality_review_status text NOT NULL DEFAULT 'pending', payment_status text NOT NULL DEFAULT 'not_ready',
 status training_project_status NOT NULL DEFAULT 'READY_FOR_RECORDING', idempotency_key text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE training_data_streams(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE, stream_type text NOT NULL, device_timestamp_start timestamptz,
 device_timestamp_end timestamptz, offset_milliseconds integer, synchronization_quality numeric(7,4), dropped_segments jsonb NOT NULL DEFAULT '[]', disconnections jsonb NOT NULL DEFAULT '[]',
 calibration_events jsonb NOT NULL DEFAULT '[]', clock_drift_corrections jsonb NOT NULL DEFAULT '[]', object_key text NOT NULL, checksum text NOT NULL, UNIQUE(session_id,stream_type,checksum));

CREATE TABLE wearable_catalog_products(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, manufacturer text NOT NULL, seller text NOT NULL, category text NOT NULL, tier smallint NOT NULL CHECK(tier BETWEEN 1 AND 3),
 description text NOT NULL, training_use_case text NOT NULL, supported_data_types text[] NOT NULL DEFAULT '{}', supported_export_formats text[] NOT NULL DEFAULT '{}', supported_apis text[] NOT NULL DEFAULT '{}',
 raw_data_access boolean NOT NULL DEFAULT false, subscription_required boolean NOT NULL DEFAULT false, subscription_price_cents bigint, integration_difficulty text NOT NULL,
 required_accessories text[] NOT NULL DEFAULT '{}', compatibility_notes text, listed_price_cents bigint, maximum_reference_price_cents bigint, currency char(3) NOT NULL DEFAULT 'USD', price_label text,
 external_purchase_url text NOT NULL, manufacturer_url text, image_url text, affiliate_disclosure text, approval_status wearable_approval_status NOT NULL DEFAULT 'UNREVIEWED',
 is_featured boolean NOT NULL DEFAULT false, display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, details jsonb NOT NULL DEFAULT '{}',
 last_price_checked_at timestamptz, last_compatibility_checked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE wearable_marketplace_clicks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid NOT NULL REFERENCES wearable_catalog_products(id),user_id uuid REFERENCES users(id),request_metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE wearable_devices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),catalog_product_id uuid NOT NULL REFERENCES wearable_catalog_products(id),serial_number_ciphertext text NOT NULL,owner_user_id uuid REFERENCES users(id),owner_organization_id uuid REFERENCES organizations(id),firmware_version text,software_version text,purchase_date date,warranty_expiration date,approval_status text NOT NULL,calibration_status text NOT NULL,maintenance_status text NOT NULL,last_calibrated_at timestamptz,last_used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE wearable_kits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_user_id uuid REFERENCES users(id),owner_organization_id uuid REFERENCES organizations(id),name text NOT NULL,tier smallint NOT NULL CHECK(tier BETWEEN 1 AND 3),device_ids uuid[] NOT NULL DEFAULT '{}',approved_project_ids uuid[] NOT NULL DEFAULT '{}',calibration_status text NOT NULL,maintenance_status text NOT NULL,availability_status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_idempotency_unique ON notifications(idempotency_key) WHERE idempotency_key IS NOT NULL;

INSERT INTO wearable_catalog_products(name,manufacturer,seller,category,tier,description,training_use_case,supported_data_types,raw_data_access,subscription_required,integration_difficulty,required_accessories,listed_price_cents,currency,price_label,external_purchase_url,manufacturer_url,approval_status,is_featured,display_order)
VALUES
('Polar Verity Sense','Polar','Polar','Arm sensors',1,'Upper-arm optical activity sensor.','Activity and physiological context',ARRAY['heart_rate','activity'],false,false,'Basic to intermediate',ARRAY['charger'],10495,'USD','$104.95','https://www.polar.com/us-en/products/accessories/polar-verity-sense','https://www.polar.com/','UNREVIEWED',true,10),
('Polar H10','Polar','Polar','Chest sensors',1,'Chest-strap heart-rate sensor; not motion capture.','Session activity context',ARRAY['heart_rate'],false,false,'Basic to intermediate',ARRAY[]::text[],10495,'USD','$104.95','https://www.polar.com/us-en/sensors/h10-heart-rate-sensor','https://www.polar.com/','UNREVIEWED',false,20),
('GoPro HERO','GoPro','GoPro','Action cameras',1,'Wearable action camera.','First-person or body-mounted video',ARRAY['first_person_video'],false,false,'Beginner',ARRAY['approved mount','storage card'],21999,'USD','Approximately $219.99 and above','https://gopro.com/en/us/shop/cameras','https://gopro.com/','UNREVIEWED',true,30),
('Ray-Ban Meta AI Glasses','Meta / Ray-Ban','Meta and Ray-Ban','Camera glasses',2,'Camera-enabled smart glasses; export and permissions require review.','Head-centered first-person recording',ARRAY['first_person_video','audio'],false,false,'Intermediate',ARRAY['charging case'],29900,'USD','Approximately $299-$499','https://www.meta.com/ai-glasses/shop-all/','https://www.meta.com/','UNREVIEWED',true,40),
('Oura Ring 4','Oura','Oura','Smart rings',2,'Physiological context device; not a hand-position tracker.','Activity and physiological context',ARRAY['activity','physiological'],false,true,'Intermediate',ARRAY['charger'],34900,'USD','Starting around $349','https://ouraring.com/store','https://ouraring.com/','UNREVIEWED',false,50),
('Rokoko Smartsuit Pro II','Rokoko','Rokoko','Full-body motion-capture suits',3,'Professional inertial full-body motion capture.','Whole-body robotics demonstrations',ARRAY['full_body_motion','imu'],true,false,'Professional',ARRAY['software','calibration tools'],274500,'USD','Current seller pricing','https://www.rokoko.com/products/smartsuit-pro','https://www.rokoko.com/','DATA_ACCESS_REVIEWED',true,60),
('Rokoko Smartgloves','Rokoko','Rokoko','Hand-tracking gloves',3,'Hand and finger motion capture.','Dexterous manipulation demonstrations',ARRAY['hand_tracking','finger_tracking'],true,false,'Professional',ARRAY['compatible software'],NULL,'USD','Current official price','https://www.rokoko.com/products','https://www.rokoko.com/','UNREVIEWED',false,70),
('MANUS Metagloves Pro','MANUS','MANUS or authorized seller','Hand-tracking gloves',3,'Professional high-precision hand and finger tracking.','Robotics and teleoperation capture',ARRAY['hand_tracking','finger_tracking'],true,false,'Professional',ARRAY['software license','tracking equipment'],631500,'USD','Approximately $6,315 and above','https://www.manus-meta.com/','https://www.manus-meta.com/','UNREVIEWED',true,80),
('MANUS Metagloves Pro Haptic','MANUS','MANUS or authorized seller','Haptic gloves',3,'Enterprise hand capture with supported haptics.','Dexterous capture and haptic research',ARRAY['hand_tracking','finger_tracking','haptics'],true,false,'Enterprise',ARRAY['software license','tracking equipment'],965600,'USD','Approximately $9,656 and above','https://www.manus-meta.com/','https://www.manus-meta.com/','UNREVIEWED',false,90);

-- New ticket creation is forbidden; historical rows remain queryable for audit and manual reconciliation.
DO $$ BEGIN IF to_regclass('public.queue_tickets') IS NOT NULL THEN EXECUTE 'ALTER TABLE queue_tickets ADD COLUMN IF NOT EXISTS legacy_read_only boolean NOT NULL DEFAULT true'; END IF; END $$;
