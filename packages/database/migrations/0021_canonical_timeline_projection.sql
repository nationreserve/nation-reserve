CREATE OR REPLACE FUNCTION project_outbox_event_to_timeline()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE timeline jsonb:=coalesce(NEW.metadata->'timeline','{}'::jsonb);entry uuid;candidate text;actor_org uuid;audience_ids jsonb:=coalesce(NEW.metadata->'timeline'->'organizationIds','[]'::jsonb);
BEGIN
 IF timeline='false'::jsonb OR coalesce((timeline->>'exclude')::boolean,false) THEN RETURN NEW;END IF;
 IF jsonb_array_length(audience_ids)=0 THEN candidate:=coalesce(NEW.payload->>'organizationId',NEW.payload->>'organization_id',NEW.payload->>'hiringCompanyOrganizationId',NEW.payload->>'manufacturerOrganizationId',NEW.payload->>'ownerOrganizationId',NEW.metadata->>'organizationId');IF candidate IS NOT NULL AND candidate~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN audience_ids:=jsonb_build_array(candidate);END IF;END IF;
 IF jsonb_array_length(audience_ids)=0 THEN RETURN NEW;END IF;
 candidate:=coalesce(NEW.metadata->>'actorOrganizationId',timeline->>'actorOrganizationId');IF coalesce(candidate,'')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN actor_org:=candidate::uuid;END IF;
 INSERT INTO activity_timeline_entries(event_id,event_type,category,source,occurred_at,actor_user_id,actor_organization_id,actor_role,summary,details,status,previous_status,severity,aggregate_type,aggregate_id,related_objects,attachments,metadata,source_system,correlation_id)
 VALUES(NEW.id,NEW.event_type,coalesce(timeline->>'category',timeline_category(NEW.event_type)),coalesce(timeline->>'source',CASE WHEN NEW.metadata?'actorUserId' THEN 'user_action' ELSE 'system_process' END),coalesce(NEW.occurred_at,NEW.created_at),
 CASE WHEN coalesce(NEW.metadata->>'actorUserId','')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN(NEW.metadata->>'actorUserId')::uuid END,actor_org,coalesce(timeline->>'actorRole',NEW.metadata->>'actorRole'),
 coalesce(timeline->>'summary',initcap(replace(replace(NEW.event_type,'.',' '),'_',' '))),coalesce(timeline->>'expandedDescription',timeline->>'details'),coalesce(timeline->>'currentStatus',timeline->>'status',NEW.payload->>'state'),coalesce(timeline->>'previousStatus',NEW.payload->>'previousState'),coalesce(timeline->>'severity','info'),NEW.aggregate_type,NEW.aggregate_id,
 coalesce(timeline->'relatedObjects',jsonb_build_array(jsonb_build_object('type',NEW.aggregate_type,'id',NEW.aggregate_id,'label',NEW.aggregate_type))),coalesce(timeline->'attachments','[]'::jsonb),coalesce(timeline->'metadata','{}'::jsonb),coalesce(timeline->>'sourceSystem',NEW.metadata->>'sourceSystem'),coalesce(NEW.correlation_id,CASE WHEN coalesce(NEW.metadata->>'correlationId','')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN(NEW.metadata->>'correlationId')::uuid END)) RETURNING id INTO entry;
 INSERT INTO activity_timeline_audiences(entry_id,organization_id) SELECT entry,audience.value::uuid FROM jsonb_array_elements_text(audience_ids) audience(value) JOIN organizations ON organizations.id=audience.value::uuid ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
