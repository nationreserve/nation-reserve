-- Product audit repair: manufacturer discovery and private company/manufacturer messaging.
CREATE TABLE conversation_business_contexts (
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  context_type text NOT NULL CHECK (context_type IN ('contract','purchase_order','robot_model','training_project','inquiry')),
  context_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, context_type, context_id)
);

CREATE INDEX conversation_business_context_lookup_idx
  ON conversation_business_contexts(context_type, context_id, conversation_id);

CREATE TRIGGER conversation_business_contexts_append_only
  BEFORE UPDATE OR DELETE ON conversation_business_contexts
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE INDEX manufacturer_directory_approval_idx
  ON manufacturers(approval_status, production_access_status, organization_id)
  WHERE approval_status IN ('sandbox_approved','production_approved');

CREATE INDEX conversation_participant_unread_idx
  ON conversation_participants(user_id, conversation_id, last_read_message_id)
  WHERE left_at IS NULL;
