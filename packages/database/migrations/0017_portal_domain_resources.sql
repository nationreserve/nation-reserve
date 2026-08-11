CREATE TABLE portal_domain_resources(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),resource_type text NOT NULL CHECK(resource_type IN(
 'facility','department','work_area','workforce_plan','job','responsibility','training_equipment','training_session','training_upload','training_package','work_order','opportunity','support_case','dispute')),
 name text NOT NULL,status text NOT NULL DEFAULT 'draft',data jsonb NOT NULL DEFAULT '{}',version integer NOT NULL DEFAULT 1 CHECK(version>0),created_by_user_id uuid NOT NULL REFERENCES users(id),updated_by_user_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),archived_at timestamptz,UNIQUE(organization_id,resource_type,id));
CREATE INDEX portal_resources_list_idx ON portal_domain_resources(organization_id,resource_type,status,updated_at DESC) WHERE archived_at IS NULL;
CREATE TRIGGER portal_domain_resources_updated BEFORE UPDATE ON portal_domain_resources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION index_portal_resource() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE search_type text;
BEGIN
 search_type:=CASE NEW.resource_type WHEN 'work_order' THEN 'work_order' WHEN 'training_package' THEN 'training_package' WHEN 'opportunity' THEN 'contract' ELSE 'company' END;
 IF NEW.archived_at IS NOT NULL THEN DELETE FROM global_search_documents WHERE document_type=search_type AND document_id=NEW.id AND organization_id=NEW.organization_id;RETURN NEW;END IF;
 INSERT INTO global_search_documents(organization_id,document_type,document_id,title,summary,metadata,updated_at)
 VALUES(NEW.organization_id,search_type,NEW.id,NEW.name,NEW.data->>'description',jsonb_build_object('resourceType',NEW.resource_type,'status',NEW.status),NEW.updated_at)
 ON CONFLICT(document_type,document_id,organization_id) DO UPDATE SET title=excluded.title,summary=excluded.summary,metadata=excluded.metadata,updated_at=excluded.updated_at;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_resource_search AFTER INSERT OR UPDATE ON portal_domain_resources FOR EACH ROW EXECUTE FUNCTION index_portal_resource();

INSERT INTO permission_definitions(permission_key,description) VALUES('resource.read','Read organization business resources'),('resource.write','Create and update organization business resources') ON CONFLICT DO NOTHING;
INSERT INTO role_permission_grants(organization_type,role,permission_key,effect)
SELECT organization_type,role,'resource.read','allow' FROM (VALUES('robot_owner','owner'),('robot_owner','manager'),('robot_owner','viewer'),('hiring_company','employee'),('hiring_company','supervisor'),('hiring_company','manager'),('hiring_company','administrator'),('manufacturer','viewer'),('manufacturer','engineer'),('manufacturer','manager'),('manufacturer','administrator'),('platform','support'),('platform','operations'),('platform','platform_admin'),('platform','super_admin')) roles(organization_type,role) ON CONFLICT DO NOTHING;
INSERT INTO role_permission_grants(organization_type,role,permission_key,effect)
SELECT organization_type,role,'resource.write','allow' FROM (VALUES('robot_owner','owner'),('robot_owner','manager'),('hiring_company','employee'),('hiring_company','supervisor'),('hiring_company','manager'),('hiring_company','administrator'),('manufacturer','engineer'),('manufacturer','manager'),('manufacturer','administrator'),('platform','operations'),('platform','platform_admin'),('platform','super_admin')) roles(organization_type,role) ON CONFLICT DO NOTHING;
