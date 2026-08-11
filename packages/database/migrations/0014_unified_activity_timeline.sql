-- Prompt 019 / Appendix O: permission-aware, append-only unified activity timeline.
CREATE TABLE activity_timeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES outbox_events(id),
  event_type text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'organization','operations','training','heartbeat','messaging','contract','financial',
    'security','permissions','support','robot','manufacturer','company','owner','system'
  )),
  source text NOT NULL CHECK (source IN (
    'user_action','system_automation','api_integration','heartbeat_validation',
    'background_job','administrator_action'
  )),
  occurred_at timestamptz NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  summary text NOT NULL,
  details text,
  status text,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  related_objects jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(related_objects) = 'array'),
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attachments) = 'array'),
  searchable tsvector GENERATED ALWAYS AS
    (to_tsvector('simple', coalesce(event_type,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(details,'') || ' ' || coalesce(status,''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activity_timeline_audiences (
  entry_id uuid NOT NULL REFERENCES activity_timeline_entries(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  PRIMARY KEY (entry_id, organization_id)
);

CREATE INDEX activity_timeline_time_idx ON activity_timeline_entries (occurred_at DESC, id DESC);
CREATE INDEX activity_timeline_entity_idx ON activity_timeline_entries (aggregate_type, aggregate_id, occurred_at DESC);
CREATE INDEX activity_timeline_category_idx ON activity_timeline_entries (category, occurred_at DESC);
CREATE INDEX activity_timeline_search_idx ON activity_timeline_entries USING gin (searchable);
CREATE INDEX activity_timeline_audience_idx ON activity_timeline_audiences (organization_id, entry_id);

CREATE TRIGGER activity_timeline_entries_append_only
  BEFORE UPDATE OR DELETE ON activity_timeline_entries
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER activity_timeline_audiences_append_only
  BEFORE UPDATE OR DELETE ON activity_timeline_audiences
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE OR REPLACE FUNCTION timeline_category(event_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN event_name ILIKE '%heartbeat%' OR event_name ILIKE '%offline%' THEN 'heartbeat'
    WHEN event_name ILIKE '%contract%' OR event_name ILIKE '%assignment%' THEN 'contract'
    WHEN event_name ILIKE '%invoice%' OR event_name ILIKE '%payment%' OR event_name ILIKE '%payroll%' OR event_name ILIKE '%ledger%' THEN 'financial'
    WHEN event_name ILIKE '%robot%' OR event_name ILIKE '%ownership%' THEN 'robot'
    WHEN event_name ILIKE '%manufacturer%' THEN 'manufacturer'
    WHEN event_name ILIKE '%permission%' OR event_name ILIKE '%role%' THEN 'permissions'
    WHEN event_name ILIKE '%auth%' OR event_name ILIKE '%session%' OR event_name ILIKE '%security%' THEN 'security'
    WHEN event_name ILIKE '%message%' OR event_name ILIKE '%invitation%' THEN 'messaging'
    WHEN event_name ILIKE '%organization%' OR event_name ILIKE '%member%' THEN 'organization'
    WHEN event_name ILIKE '%maintenance%' OR event_name ILIKE '%incident%' OR event_name ILIKE '%alert%' THEN 'operations'
    ELSE 'system'
  END
$$;

CREATE OR REPLACE FUNCTION project_outbox_event_to_timeline()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  timeline jsonb := coalesce(NEW.metadata->'timeline', '{}'::jsonb);
  entry uuid;
  candidate text;
  audience_ids jsonb := '[]'::jsonb;
BEGIN
  IF timeline = 'false'::jsonb OR coalesce((timeline->>'exclude')::boolean, false) THEN
    RETURN NEW;
  END IF;

  audience_ids := coalesce(timeline->'organizationIds', '[]'::jsonb);
  IF jsonb_array_length(audience_ids) = 0 THEN
    candidate := coalesce(
      NEW.payload->>'organizationId', NEW.payload->>'organization_id',
      NEW.payload->>'hiringCompanyOrganizationId', NEW.payload->>'manufacturerOrganizationId',
      NEW.payload->>'ownerOrganizationId', NEW.metadata->>'organizationId'
    );
    IF candidate IS NOT NULL AND candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      audience_ids := jsonb_build_array(candidate);
    END IF;
  END IF;

  -- Events without an authorized audience remain in the immutable outbox but are not user-visible.
  IF jsonb_array_length(audience_ids) = 0 THEN RETURN NEW; END IF;

  INSERT INTO activity_timeline_entries (
    event_id,event_type,category,source,occurred_at,actor_user_id,summary,details,status,severity,
    aggregate_type,aggregate_id,related_objects,attachments
  ) VALUES (
    NEW.id, NEW.event_type,
    coalesce(timeline->>'category', timeline_category(NEW.event_type)),
    coalesce(timeline->>'source', CASE WHEN NEW.metadata ? 'actorUserId' THEN 'user_action' ELSE 'system_automation' END),
    coalesce(NEW.occurred_at, NEW.created_at),
    CASE WHEN coalesce(NEW.metadata->>'actorUserId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN (NEW.metadata->>'actorUserId')::uuid ELSE NULL END,
    coalesce(timeline->>'summary', initcap(replace(replace(NEW.event_type,'.',' '),'_',' '))),
    timeline->>'details', timeline->>'status', coalesce(timeline->>'severity','info'),
    NEW.aggregate_type, NEW.aggregate_id,
    coalesce(timeline->'relatedObjects', jsonb_build_array(jsonb_build_object('type',NEW.aggregate_type,'id',NEW.aggregate_id,'label',NEW.aggregate_type))),
    coalesce(timeline->'attachments','[]'::jsonb)
  ) RETURNING id INTO entry;

  INSERT INTO activity_timeline_audiences(entry_id, organization_id)
  SELECT entry, audience.value::uuid
  FROM jsonb_array_elements_text(audience_ids) AS audience(value)
  JOIN organizations ON organizations.id = audience.value::uuid
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END
$$;

CREATE TRIGGER outbox_project_activity_timeline
  AFTER INSERT ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION project_outbox_event_to_timeline();


