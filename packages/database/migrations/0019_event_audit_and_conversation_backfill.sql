INSERT INTO conversation_audience_organizations(conversation_id,organization_id)
SELECT id,organization_id FROM conversations WHERE organization_id IS NOT NULL ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION project_outbox_event_to_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid;actor_org uuid;candidate text;
BEGIN
 IF coalesce(NEW.metadata->>'actorUserId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN actor:=(NEW.metadata->>'actorUserId')::uuid;END IF;
 candidate:=coalesce(NEW.metadata->>'actorOrganizationId',NEW.payload->>'organizationId',NEW.payload->>'organization_id');
 IF coalesce(candidate,'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN actor_org:=candidate::uuid;END IF;
 INSERT INTO audit_logs(actor_user_id,actor_organization_id,action,resource_type,resource_id,previous_state,new_state,source,correlation_id,request_id)
 VALUES(actor,actor_org,NEW.event_type,NEW.aggregate_type,NEW.aggregate_id,NEW.payload->'previousState',NEW.payload,
 coalesce(NEW.metadata->'timeline'->>'source','domain_event'),NEW.correlation_id,NEW.metadata->>'requestId');
 RETURN NEW;
END $$;
CREATE TRIGGER outbox_project_immutable_audit AFTER INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION project_outbox_event_to_audit();
