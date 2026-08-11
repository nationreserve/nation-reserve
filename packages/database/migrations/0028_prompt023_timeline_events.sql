BEGIN;

CREATE OR REPLACE FUNCTION prompt023_timeline_event() RETURNS trigger LANGUAGE plpgsql AS $prompt023$
DECLARE
  actor uuid;
  orgs jsonb;
  event_name text;
BEGIN
  actor := coalesce(
    (to_jsonb(NEW)->>'updated_by_user_id')::uuid,
    (to_jsonb(NEW)->>'approved_by_user_id')::uuid,
    (to_jsonb(NEW)->>'invited_by_user_id')::uuid,
    (to_jsonb(NEW)->>'reviewed_by_user_id')::uuid,
    (to_jsonb(NEW)->>'user_id')::uuid
  );
  IF to_jsonb(NEW) ? 'organization_id' AND to_jsonb(NEW)->>'organization_id' IS NOT NULL THEN
    orgs := jsonb_build_array(to_jsonb(NEW)->>'organization_id');
  ELSE
    SELECT coalesce(jsonb_agg(id::text),'[]'::jsonb) INTO orgs
    FROM organizations WHERE organization_type='platform' AND status='active';
  END IF;
  event_name := TG_ARGV[0] || CASE WHEN TG_OP='INSERT' THEN '.created' ELSE '.updated' END;
  INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,metadata,created_at,updated_at)
  VALUES(
    gen_random_uuid(),event_name,TG_ARGV[0],NEW.id,
    jsonb_build_object('operation',TG_OP,'status',to_jsonb(NEW)->>'status','version',to_jsonb(NEW)->>'version','actorUserId',actor),
    jsonb_build_object('schemaVersion',1,'timeline',jsonb_build_object(
      'organizationIds',orgs,'category',TG_ARGV[1],'source','platform_administration',
      'sourceSystem','prompt_023','summary',initcap(replace(event_name,'.',' ')),
      'status',coalesce(to_jsonb(NEW)->>'status','recorded'))),now(),now()
  );
  RETURN NEW;
END
$prompt023$;

CREATE TRIGGER legal_documents_timeline AFTER INSERT OR UPDATE ON legal_document_versions
FOR EACH ROW EXECUTE FUNCTION prompt023_timeline_event('legal.document','administration');
CREATE TRIGGER legal_acceptances_timeline AFTER INSERT ON legal_acceptance_records
FOR EACH ROW EXECUTE FUNCTION prompt023_timeline_event('legal.acceptance','administration');
CREATE TRIGGER pilot_configuration_timeline AFTER INSERT OR UPDATE ON pilot_configurations
FOR EACH ROW EXECUTE FUNCTION prompt023_timeline_event('pilot.configuration','administration');
CREATE TRIGGER pilot_enrollment_timeline AFTER INSERT OR UPDATE ON pilot_organization_enrollments
FOR EACH ROW EXECUTE FUNCTION prompt023_timeline_event('pilot.enrollment','organization');
CREATE TRIGGER readiness_review_timeline AFTER INSERT OR UPDATE ON readiness_reviews
FOR EACH ROW EXECUTE FUNCTION prompt023_timeline_event('readiness.review','release');
CREATE TRIGGER security_finding_timeline AFTER INSERT OR UPDATE ON security_review_findings
FOR EACH ROW EXECUTE FUNCTION prompt023_timeline_event('security.finding','security');

COMMIT;
