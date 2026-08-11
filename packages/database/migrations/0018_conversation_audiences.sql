CREATE TABLE conversation_audience_organizations(conversation_id uuid NOT NULL REFERENCES conversations(id),organization_id uuid NOT NULL REFERENCES organizations(id),PRIMARY KEY(conversation_id,organization_id));
CREATE INDEX conversation_audience_org_idx ON conversation_audience_organizations(organization_id,conversation_id);
CREATE TRIGGER conversation_audience_append_only BEFORE UPDATE OR DELETE ON conversation_audience_organizations FOR EACH ROW EXECUTE FUNCTION reject_mutation();
