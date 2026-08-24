BEGIN;

CREATE TYPE support_ticket_status AS ENUM('OPEN','AWAITING_SUPPORT','AWAITING_USER','IN_PROGRESS','RESOLVED','CLOSED','ESCALATED');
CREATE TYPE support_ticket_priority AS ENUM('LOW','NORMAL','HIGH','URGENT');

CREATE TABLE support_tickets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 requester_user_id uuid NOT NULL REFERENCES users(id), organization_id uuid REFERENCES organizations(id),
 subject text NOT NULL, category text NOT NULL CHECK(category IN('ACCOUNT','PAYMENTS','BANK_PAYOUT_ACCOUNT','DOWNPAYMENT_QUEUE','ROBOT_OWNERSHIP','COMPANY_CONTRACT','PURCHASE_ORDER','MANUFACTURER','HEARTBEAT_ROBOT_OFFLINE','TRAINING_DATA','TRAINING_EQUIPMENT','MESSAGING','FILE_UPLOAD','BILLING','REFUND','OTHER')),
 description text NOT NULL, priority support_ticket_priority NOT NULL DEFAULT 'NORMAL', status support_ticket_status NOT NULL DEFAULT 'OPEN',
 assigned_to_user_id uuid REFERENCES users(id), related_records jsonb NOT NULL DEFAULT '{}', diagnostics_safe jsonb NOT NULL DEFAULT '{}',
 resolved_at timestamptz, closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX support_tickets_requester_idx ON support_tickets(requester_user_id,status,updated_at DESC);
CREATE INDEX support_tickets_admin_idx ON support_tickets(status,priority,updated_at DESC);

CREATE TABLE support_ticket_messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES support_tickets(id), author_user_id uuid NOT NULL REFERENCES users(id),
 body text NOT NULL, internal_note boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX support_ticket_messages_idx ON support_ticket_messages(ticket_id,created_at,id);

CREATE TABLE support_ticket_attachments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES support_tickets(id), message_id uuid REFERENCES support_ticket_messages(id),
 object_id uuid NOT NULL REFERENCES stored_objects(id), uploader_user_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(ticket_id,object_id));

CREATE TABLE message_attachments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id), message_id uuid NOT NULL REFERENCES messages(id),
 object_id uuid NOT NULL REFERENCES stored_objects(id), uploader_user_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(message_id,object_id));
CREATE INDEX message_attachments_conversation_idx ON message_attachments(conversation_id,created_at DESC);

CREATE TABLE secure_file_access_log(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), object_id uuid NOT NULL REFERENCES stored_objects(id), accessor_user_id uuid NOT NULL REFERENCES users(id),
 access_context text NOT NULL CHECK(access_context IN('SUPPORT','MESSAGE','TRAINING','ADMIN_DIAGNOSTIC')), context_id uuid, created_at timestamptz NOT NULL DEFAULT now());

CREATE TRIGGER support_ticket_messages_immutable BEFORE UPDATE OR DELETE ON support_ticket_messages FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER secure_file_access_immutable BEFORE UPDATE OR DELETE ON secure_file_access_log FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER message_attachments_immutable BEFORE UPDATE OR DELETE ON message_attachments FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER support_tickets_updated BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO permission_definitions(permission_key,description) VALUES
 ('support.ticket.create','Create and manage own support tickets'),
 ('support.ticket.admin','Administer support tickets and private internal notes'),
 ('queue.public.read','View anonymized down-payment queue activity'),
 ('platform.diagnostics.read','View safe operational diagnostic projections')
ON CONFLICT DO NOTHING;

COMMIT;
