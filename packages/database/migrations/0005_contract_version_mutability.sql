-- Contract drafts must remain editable through the two-party approval workflow,
-- while accepted revisions remain immutable.
DROP TRIGGER IF EXISTS contract_versions_append_only ON contract_versions;

CREATE OR REPLACE FUNCTION protect_contract_version_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'contract versions are historical records and cannot be deleted';
  END IF;

  IF OLD.status IN ('approved', 'superseded') THEN
    RAISE EXCEPTION 'approved or superseded contract versions are immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER contract_versions_history_guard
BEFORE UPDATE OR DELETE ON contract_versions
FOR EACH ROW EXECUTE FUNCTION protect_contract_version_history();

-- Scheduled assignments are live reservations and must participate in the same
-- database-enforced no-overlap rule as ready and active assignments.
ALTER TABLE robot_assignments DROP CONSTRAINT IF EXISTS active_robot_assignment_no_overlap;
ALTER TABLE robot_assignments
  ADD CONSTRAINT active_robot_assignment_no_overlap
  EXCLUDE USING gist (
    robot_id WITH =,
    tstzrange(scheduled_start_at, scheduled_end_at, '[)') WITH &&
  ) WHERE (status IN ('reserved','ready','scheduled','active','paused','interrupted'));