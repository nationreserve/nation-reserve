CREATE TABLE report_definitions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_key text NOT NULL UNIQUE,name text NOT NULL,
 category text NOT NULL CHECK(category IN('operational','financial','manufacturing','company','owner','platform')),
 description text NOT NULL,source_view text NOT NULL,platform_only boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE saved_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_definition_id uuid NOT NULL REFERENCES report_definitions(id),
 owner_user_id uuid NOT NULL REFERENCES users(id),organization_id uuid REFERENCES organizations(id),name text NOT NULL,
 filters jsonb NOT NULL DEFAULT '{}',layout jsonb NOT NULL DEFAULT '{}',favorite boolean NOT NULL DEFAULT false,
 shared_within_organization boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX saved_reports_owner_idx ON saved_reports(owner_user_id,organization_id);
CREATE TABLE scheduled_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_definition_id uuid NOT NULL REFERENCES report_definitions(id),
 owner_user_id uuid NOT NULL REFERENCES users(id),organization_id uuid REFERENCES organizations(id),name text NOT NULL,
 frequency text NOT NULL CHECK(frequency IN('daily','weekly','monthly','quarterly')),
 recipients jsonb NOT NULL,export_type text NOT NULL CHECK(export_type IN('csv','xlsx','pdf')),
 filters jsonb NOT NULL DEFAULT '{}',timezone text NOT NULL DEFAULT 'UTC',enabled boolean NOT NULL DEFAULT true,
 next_run_at timestamptz NOT NULL,last_run_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),CHECK(jsonb_typeof(recipients)='array'));
CREATE INDEX scheduled_reports_due_idx ON scheduled_reports(next_run_at) WHERE enabled;
CREATE TABLE report_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_definition_id uuid NOT NULL REFERENCES report_definitions(id),
 requested_by_user_id uuid REFERENCES users(id),organization_id uuid REFERENCES organizations(id),
 scheduled_report_id uuid REFERENCES scheduled_reports(id),status text NOT NULL
 CHECK(status IN('queued','running','succeeded','failed')),filters jsonb NOT NULL DEFAULT '{}',
 timezone text NOT NULL,report_version integer NOT NULL,started_at timestamptz,finished_at timestamptz,
 row_count integer,failure_message_safe text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE report_exports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_run_id uuid NOT NULL REFERENCES report_runs(id),
 requested_by_user_id uuid REFERENCES users(id),organization_id uuid REFERENCES organizations(id),
 export_type text NOT NULL CHECK(export_type IN('csv','xlsx','pdf')),status text NOT NULL
 CHECK(status IN('queued','generating','ready','failed','expired')),storage_key text,content_type text,
 byte_size bigint CHECK(byte_size>=0),checksum_sha256 text,content bytea,expires_at timestamptz,
 generated_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE warehouse_refresh_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),refresh_type text NOT NULL CHECK(refresh_type IN('incremental','full')),
 status text NOT NULL CHECK(status IN('running','succeeded','failed')),watermark_from timestamptz,
 watermark_to timestamptz NOT NULL,views_refreshed jsonb NOT NULL DEFAULT '[]',started_at timestamptz NOT NULL,
 finished_at timestamptz,failure_message_safe text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE reporting_daily_snapshots(
 snapshot_date date NOT NULL,metric_key text NOT NULL,organization_id uuid REFERENCES organizations(id),
 dimension_key text NOT NULL DEFAULT '',value_numeric numeric(24,6) NOT NULL,source_version integer NOT NULL DEFAULT 1,
 refreshed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(snapshot_date,metric_key,organization_id,dimension_key));

CREATE MATERIALIZED VIEW robot_daily_summary AS
SELECT d.day::date summary_date,r.id robot_id,r.manufacturer_id,r.robot_model_id,
 COALESCE(o.owner_organization_id,NULL) owner_organization_id,
 COALESCE(SUM(v.verified_duration_seconds),0)::bigint verified_seconds,
 COALESCE(SUM(dt.duration_seconds),0)::bigint downtime_seconds,
 COUNT(DISTINCT v.assignment_id)::integer assignment_count
FROM robots r CROSS JOIN LATERAL generate_series(CURRENT_DATE-interval '730 days',CURRENT_DATE,interval '1 day') d(day)
LEFT JOIN robot_ownership_records o ON o.robot_id=r.id AND o.ownership_status='verified'
 AND o.ownership_start_at<d.day+interval '1 day' AND (o.ownership_end_at IS NULL OR o.ownership_end_at>=d.day)
LEFT JOIN verified_operating_intervals v ON v.robot_id=r.id AND v.interval_start_at>=d.day AND v.interval_start_at<d.day+interval '1 day'
 AND v.status IN('closed','finalized')
LEFT JOIN robot_downtime_intervals dt ON dt.robot_id=r.id AND dt.downtime_start_at>=d.day AND dt.downtime_start_at<d.day+interval '1 day'
GROUP BY d.day,r.id,r.manufacturer_id,r.robot_model_id,o.owner_organization_id WITH NO DATA;
CREATE UNIQUE INDEX robot_daily_summary_unique ON robot_daily_summary(summary_date,robot_id);

CREATE MATERIALIZED VIEW company_daily_summary AS
SELECT date_trunc('day',a.created_at)::date summary_date,h.organization_id,
 a.hiring_company_id,a.facility_id,a.department_id,SUM(a.verified_duration_seconds)::bigint verified_seconds,
 SUM(a.company_total_charge_minor_units)::bigint spend_minor_units,COUNT(DISTINCT a.robot_id)::integer robots_used
FROM financial_accruals a JOIN hiring_companies h ON h.id=a.hiring_company_id
WHERE a.status='posted' GROUP BY 1,h.organization_id,a.hiring_company_id,a.facility_id,a.department_id WITH NO DATA;
CREATE UNIQUE INDEX company_daily_summary_unique ON company_daily_summary(summary_date,hiring_company_id,facility_id,(COALESCE(department_id,'00000000-0000-0000-0000-000000000000'::uuid)));

CREATE MATERIALIZED VIEW owner_daily_summary AS
SELECT date_trunc('day',created_at)::date summary_date,robot_owner_organization_id organization_id,
 SUM(verified_duration_seconds)::bigint verified_seconds,SUM(owner_gross_earning_minor_units)::bigint gross_minor_units,
 SUM(owner_platform_fee_minor_units)::bigint platform_fee_minor_units,SUM(owner_net_earning_minor_units)::bigint net_minor_units,
 COUNT(DISTINCT robot_id)::integer active_robots FROM financial_accruals WHERE status='posted'
GROUP BY 1,robot_owner_organization_id WITH NO DATA;
CREATE UNIQUE INDEX owner_daily_summary_unique ON owner_daily_summary(summary_date,organization_id);

CREATE MATERIALIZED VIEW financial_daily_summary AS
SELECT date_trunc('day',created_at)::date summary_date,SUM(company_total_charge_minor_units)::bigint company_revenue_minor_units,
 SUM(platform_revenue_minor_units)::bigint platform_revenue_minor_units,SUM(owner_net_earning_minor_units)::bigint owner_net_minor_units,
 SUM(verified_duration_seconds)::bigint verified_seconds,COUNT(DISTINCT robot_id)::integer active_robots,
 COUNT(DISTINCT hiring_company_id)::integer active_companies FROM financial_accruals WHERE status='posted' GROUP BY 1 WITH NO DATA;
CREATE UNIQUE INDEX financial_daily_summary_unique ON financial_daily_summary(summary_date);

CREATE MATERIALIZED VIEW payment_daily_summary AS
SELECT date_trunc('day',created_at)::date summary_date,COUNT(*)::integer attempts,
 COUNT(*) FILTER(WHERE status IN('succeeded','settled'))::integer successful,
 COUNT(*) FILTER(WHERE status='failed')::integer failed,COALESCE(SUM(amount_minor_units),0)::bigint volume_minor_units
FROM payment_attempts GROUP BY 1 WITH NO DATA;
CREATE UNIQUE INDEX payment_daily_summary_unique ON payment_daily_summary(summary_date);

CREATE MATERIALIZED VIEW heartbeat_daily_summary AS
SELECT date_trunc('day',received_at)::date summary_date,robot_id,COUNT(*)::integer received,
 COUNT(*) FILTER(WHERE validation_status='accepted')::integer accepted,
 COUNT(*) FILTER(WHERE validation_status<>'accepted')::integer rejected
FROM robot_heartbeat_messages GROUP BY 1,robot_id WITH NO DATA;
CREATE UNIQUE INDEX heartbeat_daily_summary_unique ON heartbeat_daily_summary(summary_date,robot_id);

INSERT INTO report_definitions(report_key,name,category,description,source_view,platform_only) VALUES
('robot_utilization','Robot utilization','operational','Verified operating time, downtime, and assignments','robot_daily_summary',false),
('company_costs','Company labor and cost','company','Robot hours and costs by facility and department','company_daily_summary',false),
('owner_earnings','Owner earnings','owner','Gross, fee, net, utilization, and active robot history','owner_daily_summary',false),
('platform_financial_growth','Platform financial growth','platform','Revenue, robot hours, and organization activity','financial_daily_summary',true),
('payment_performance','Payment performance','financial','Payment success and volume trends','payment_daily_summary',true),
('heartbeat_reliability','Heartbeat reliability','operational','Accepted and rejected heartbeat trends','heartbeat_daily_summary',false);
INSERT INTO background_job_definitions(job_name,worker_name,description,queue_name,critical,supports_cancel) VALUES
('reporting-projection-refresh','reporting-worker','Refresh reporting materialized views and warehouse snapshots','reporting',true,false),
('scheduled-report-generation','reporting-worker','Generate and deliver due scheduled reports','reporting',false,true)
ON CONFLICT(job_name) DO NOTHING;
