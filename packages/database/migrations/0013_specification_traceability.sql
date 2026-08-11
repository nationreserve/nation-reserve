CREATE TABLE specification_sources(
 source_id text PRIMARY KEY,title text NOT NULL,source_type text NOT NULL,version text NOT NULL,status text NOT NULL,
 precedence integer NOT NULL,location text,file_present boolean NOT NULL,record jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_requirements(
 requirement_id text PRIMARY KEY CHECK(requirement_id~'^RWP-[A-Z0-9]+-[0-9]{4}$'),title text NOT NULL,domain text NOT NULL,
 source_id text NOT NULL REFERENCES specification_sources(source_id),priority text NOT NULL,scope_status text NOT NULL,
 immutability text NOT NULL,implementation_status text NOT NULL,validation_status text NOT NULL,record jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_requirement_links(
 requirement_id text NOT NULL REFERENCES specification_requirements(requirement_id),source_id text NOT NULL REFERENCES specification_sources(source_id),
 relationship_type text NOT NULL CHECK(relationship_type IN('primary','supports','clarifies','supersedes','conflicts','implements','tests','documents')),
 section_reference text,notes text,PRIMARY KEY(requirement_id,source_id,relationship_type));
CREATE TABLE specification_traceability(
 requirement_id text PRIMARY KEY REFERENCES specification_requirements(requirement_id),record jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_features(feature_id text PRIMARY KEY,record jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_journeys(journey_id text PRIMARY KEY,record jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_screens(screen_id text PRIMARY KEY,route text NOT NULL,record jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_user_explanations(explanation_id text PRIMARY KEY,record jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_workflows(workflow_id text PRIMARY KEY,record jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_conflicts(
 conflict_id text PRIMARY KEY,severity text NOT NULL,status text NOT NULL,record jsonb NOT NULL,
 proposed_resolution text,approved_resolution text,resolved_by_user_id uuid REFERENCES users(id),resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_deferred_items(deferred_id text PRIMARY KEY,status text NOT NULL,record jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_validation_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),schema_version text NOT NULL,command text NOT NULL,status text NOT NULL
 CHECK(status IN('running','passed','failed')),started_at timestamptz NOT NULL,completed_at timestamptz,source_commit text,
 total_sources integer NOT NULL DEFAULT 0,total_requirements integer NOT NULL DEFAULT 0,total_issues integer NOT NULL DEFAULT 0,
 critical_issues integer NOT NULL DEFAULT 0,high_issues integer NOT NULL DEFAULT 0,medium_issues integer NOT NULL DEFAULT 0,
 low_issues integer NOT NULL DEFAULT 0,report_path text,created_by_user_id uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE specification_validation_issues(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),validation_run_id uuid NOT NULL REFERENCES specification_validation_runs(id),
 issue_code text NOT NULL,severity text NOT NULL CHECK(severity IN('critical','high','medium','low')),category text NOT NULL,
 message text NOT NULL,resource_type text NOT NULL,resource_id text NOT NULL,source_path text,suggested_resolution text NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN('open','acknowledged','resolved','waived')),created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz);
CREATE INDEX specification_issues_open_idx ON specification_validation_issues(severity,status) WHERE status='open';
CREATE TABLE specification_coverage_waivers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reason text NOT NULL,authorized_by_user_id uuid NOT NULL REFERENCES users(id),
 review_at date NOT NULL,affected_requirement_ids jsonb NOT NULL,status text NOT NULL DEFAULT 'active'
 CHECK(status IN('active','expired','revoked')),created_at timestamptz NOT NULL DEFAULT now(),CHECK(jsonb_array_length(affected_requirement_ids)>0));
CREATE TABLE specification_sync_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),status text NOT NULL,schema_version text NOT NULL,source_count integer NOT NULL,
 requirement_count integer NOT NULL,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
