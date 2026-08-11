-- Prompt 019 shared backend infrastructure.
CREATE TABLE permission_definitions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),permission_key text NOT NULL UNIQUE,description text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE role_permission_grants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_type text NOT NULL,role text NOT NULL,permission_key text NOT NULL REFERENCES permission_definitions(permission_key),effect text NOT NULL CHECK(effect IN('allow','deny')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_type,role,permission_key));
CREATE TABLE resource_permission_grants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),user_id uuid NOT NULL REFERENCES users(id),resource_type text NOT NULL,resource_id uuid NOT NULL,permission_key text NOT NULL REFERENCES permission_definitions(permission_key),effect text NOT NULL CHECK(effect IN('allow','deny')),expires_at timestamptz,granted_by_user_id uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX resource_permission_lookup_idx ON resource_permission_grants(user_id,organization_id,resource_type,resource_id,permission_key);

CREATE TABLE workflow_instances(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workflow_type text NOT NULL,aggregate_type text NOT NULL,aggregate_id uuid NOT NULL,state text NOT NULL,version integer NOT NULL DEFAULT 1 CHECK(version>0),organization_ids uuid[] NOT NULL,context jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workflow_type,aggregate_type,aggregate_id));
CREATE TABLE workflow_transition_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workflow_id uuid NOT NULL REFERENCES workflow_instances(id),from_state text NOT NULL,action text NOT NULL,to_state text NOT NULL,actor_user_id uuid REFERENCES users(id),event_id uuid NOT NULL REFERENCES outbox_events(id),context jsonb NOT NULL DEFAULT '{}',occurred_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workflow_id,event_id));
CREATE TRIGGER workflow_transition_history_append_only BEFORE UPDATE OR DELETE ON workflow_transition_history FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TABLE event_consumer_deliveries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES outbox_events(id),consumer text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','processing','completed','failed','dead_letter')),attempts integer NOT NULL DEFAULT 0,max_attempts integer NOT NULL DEFAULT 10,available_at timestamptz NOT NULL DEFAULT now(),locked_at timestamptz,locked_by text,last_error text,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(event_id,consumer));
CREATE INDEX event_delivery_claim_idx ON event_consumer_deliveries(consumer,status,available_at,created_at);

CREATE TABLE background_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_type text NOT NULL,payload jsonb NOT NULL,organization_id uuid REFERENCES organizations(id),status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','running','completed','failed','dead_letter','cancelled')),priority integer NOT NULL DEFAULT 100,attempts integer NOT NULL DEFAULT 0,max_attempts integer NOT NULL DEFAULT 10,available_at timestamptz NOT NULL DEFAULT now(),locked_at timestamptz,locked_by text,last_error text,idempotency_key text,correlation_id uuid,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,UNIQUE(job_type,idempotency_key));
CREATE INDEX background_jobs_claim_idx ON background_jobs(status,priority,available_at,created_at);

CREATE TABLE notification_preferences(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),organization_id uuid REFERENCES organizations(id),event_type text NOT NULL,channel text NOT NULL CHECK(channel IN('in_app','email','push','webhook')),enabled boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,organization_id,event_type,channel));
CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid REFERENCES outbox_events(id),user_id uuid NOT NULL REFERENCES users(id),organization_id uuid REFERENCES organizations(id),channel text NOT NULL CHECK(channel IN('in_app','email','push','webhook')),title text NOT NULL,body text NOT NULL,href text,status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','delivering','delivered','failed','read','dismissed')),read_at timestamptz,dismissed_at timestamptz,delivered_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(event_id,user_id,channel));
CREATE INDEX notifications_user_idx ON notifications(user_id,status,created_at DESC);

CREATE TABLE conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES organizations(id),conversation_type text NOT NULL CHECK(conversation_type IN('direct','group','support','contract')),subject text,retention_until timestamptz,created_by_user_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE conversation_participants(conversation_id uuid NOT NULL REFERENCES conversations(id),user_id uuid NOT NULL REFERENCES users(id),role text NOT NULL DEFAULT 'member',joined_at timestamptz NOT NULL DEFAULT now(),left_at timestamptz,last_read_message_id uuid,PRIMARY KEY(conversation_id,user_id));
CREATE TABLE messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid NOT NULL REFERENCES conversations(id),sender_user_id uuid REFERENCES users(id),body text NOT NULL,mentions uuid[] NOT NULL DEFAULT '{}',attachments jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now(),edited_at timestamptz,deleted_at timestamptz);
ALTER TABLE conversation_participants ADD CONSTRAINT conversation_last_read_fk FOREIGN KEY(last_read_message_id) REFERENCES messages(id);
CREATE INDEX messages_conversation_idx ON messages(conversation_id,created_at DESC,id DESC);

CREATE TABLE stored_objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES organizations(id),owner_user_id uuid NOT NULL REFERENCES users(id),bucket text NOT NULL,object_key text NOT NULL UNIQUE,filename text NOT NULL,content_type text NOT NULL,size_bytes bigint CHECK(size_bytes>=0),checksum_sha256 text,version integer NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'pending_upload' CHECK(status IN('pending_upload','quarantined','scanning','available','rejected','deleted')),classification text NOT NULL DEFAULT 'private' CHECK(classification IN('private','organization','platform','public')),malware_scan_status text NOT NULL DEFAULT 'pending' CHECK(malware_scan_status IN('pending','clean','infected','failed')),retention_until timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE stored_object_access(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),object_id uuid NOT NULL REFERENCES stored_objects(id),user_id uuid REFERENCES users(id),organization_id uuid REFERENCES organizations(id),permission text NOT NULL CHECK(permission IN('read','write','delete')),expires_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),CHECK(user_id IS NOT NULL OR organization_id IS NOT NULL));

CREATE TABLE idempotency_records(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),scope text NOT NULL,idempotency_key text NOT NULL,request_hash text NOT NULL,response_status integer,response_body jsonb,status text NOT NULL DEFAULT 'processing' CHECK(status IN('processing','completed','failed')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(scope,idempotency_key));

CREATE TABLE integration_connections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES organizations(id),provider_type text NOT NULL CHECK(provider_type IN('payment','email','mapping','manufacturer','training_equipment','authentication','webhook')),provider_name text NOT NULL,status text NOT NULL DEFAULT 'sandbox' CHECK(status IN('sandbox','active','disabled','revoked')),credential_reference text NOT NULL,configuration jsonb NOT NULL DEFAULT '{}',last_health_at timestamptz,last_error text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE global_search_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES organizations(id),document_type text NOT NULL CHECK(document_type IN('robot','manufacturer','company','work_order','contract','conversation','training_package','invoice')),document_id uuid NOT NULL,title text NOT NULL,summary text,metadata jsonb NOT NULL DEFAULT '{}',searchable tsvector GENERATED ALWAYS AS(to_tsvector('simple',coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(metadata::text,''))) STORED,updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_type,document_id,organization_id));
CREATE INDEX global_search_text_idx ON global_search_documents USING gin(searchable);
CREATE INDEX global_search_scope_idx ON global_search_documents(organization_id,document_type,updated_at DESC);

CREATE OR REPLACE FUNCTION fanout_outbox_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO event_consumer_deliveries(event_id,consumer) VALUES
    (NEW.id,'notifications'),(NEW.id,'analytics'),(NEW.id,'background_jobs'),(NEW.id,'audit')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER outbox_fanout_consumers AFTER INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fanout_outbox_event();

CREATE TRIGGER workflow_instances_updated BEFORE UPDATE ON workflow_instances FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER event_consumer_deliveries_updated BEFORE UPDATE ON event_consumer_deliveries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER background_jobs_updated BEFORE UPDATE ON background_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notification_preferences_updated BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stored_objects_updated BEFORE UPDATE ON stored_objects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER idempotency_records_updated BEFORE UPDATE ON idempotency_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER integration_connections_updated BEFORE UPDATE ON integration_connections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO permission_definitions(permission_key,description) VALUES
('activity.read','Read authorized activity'),('search.read','Search authorized organization records'),
('notification.read','Read own notifications'),('notification.manage','Manage own notification state'),
('conversation.read','Read participating conversations'),('conversation.write','Send messages to participating conversations'),
('storage.upload','Create controlled uploads'),('storage.read','Read authorized stored objects'),
('workflow.transition','Execute an authorized business workflow transition'),('job.read','Read background job state')
ON CONFLICT DO NOTHING;


