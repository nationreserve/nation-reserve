-- Default grants remain data-driven and may be replaced by future custom roles.
INSERT INTO role_permission_grants(organization_type,role,permission_key,effect)
SELECT organization_type,role,permission_key,'allow' FROM (VALUES
 ('robot_owner','owner'),('robot_owner','manager'),('robot_owner','viewer'),
 ('hiring_company','employee'),('hiring_company','supervisor'),('hiring_company','manager'),('hiring_company','administrator'),
 ('manufacturer','viewer'),('manufacturer','engineer'),('manufacturer','manager'),('manufacturer','administrator'),
 ('platform','support'),('platform','operations'),('platform','billing'),('platform','security'),('platform','platform_admin'),('platform','super_admin')
) roles(organization_type,role)
CROSS JOIN (VALUES('activity.read'),('search.read'),('notification.read'),('notification.manage'),('conversation.read'),('conversation.write'),('storage.read')) permissions(permission_key)
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants(organization_type,role,permission_key,effect)
SELECT organization_type,role,permission_key,'allow' FROM (VALUES
 ('robot_owner','owner'),('robot_owner','manager'),
 ('hiring_company','supervisor'),('hiring_company','manager'),('hiring_company','administrator'),
 ('manufacturer','engineer'),('manufacturer','manager'),('manufacturer','administrator'),
 ('platform','operations'),('platform','billing'),('platform','security'),('platform','platform_admin'),('platform','super_admin')
) roles(organization_type,role)
CROSS JOIN (VALUES('storage.upload'),('workflow.transition')) permissions(permission_key)
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants(organization_type,role,permission_key,effect)
SELECT 'platform',role,'job.read','allow' FROM (VALUES('operations'),('platform_admin'),('super_admin')) roles(role)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION project_outbox_event_to_notifications()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  timeline jsonb := coalesce(NEW.metadata->'timeline','{}'::jsonb);
  audience_ids jsonb := coalesce(NEW.metadata->'timeline'->'organizationIds','[]'::jsonb);
BEGIN
  IF jsonb_array_length(audience_ids)=0 THEN RETURN NEW; END IF;
  INSERT INTO notifications(event_id,user_id,organization_id,channel,title,body,href,status)
  SELECT NEW.id,m.user_id,m.organization_id,'in_app',
    coalesce(timeline->>'summary',initcap(replace(replace(NEW.event_type,'.',' '),'_',' '))),
    coalesce(timeline->>'details',coalesce(timeline->>'summary',NEW.event_type)),timeline->>'href','delivered'
  FROM jsonb_array_elements_text(audience_ids) audience(value)
  JOIN organization_memberships m ON m.organization_id=audience.value::uuid AND m.status='active'
  LEFT JOIN notification_preferences p ON p.user_id=m.user_id AND p.organization_id=m.organization_id AND p.event_type IN(NEW.event_type,'*') AND p.channel='in_app'
  WHERE coalesce(p.enabled,true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER outbox_project_notifications AFTER INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION project_outbox_event_to_notifications();
