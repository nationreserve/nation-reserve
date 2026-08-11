-- Product correction: preserve historical audit data, but prohibit all new training compensation.
ALTER TABLE training_projects ADD COLUMN IF NOT EXISTS compensation_deprecated boolean NOT NULL DEFAULT true;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS compensation_deprecated boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION prohibit_training_compensation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'TRAINING_COMPENSATION_DISABLED'; END $$;
DO $$ BEGIN
 IF to_regclass('public.training_compensation_ledger_entries') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='training_compensation_no_new_records') THEN
  EXECUTE 'CREATE TRIGGER training_compensation_no_new_records BEFORE INSERT ON training_compensation_ledger_entries FOR EACH ROW EXECUTE FUNCTION prohibit_training_compensation()';
 END IF;
END $$;

COMMENT ON TABLE training_compensation_ledger_entries IS 'Deprecated historical audit only. RoboWorkPool does not pay human training workers.';

ALTER TABLE training_projects ALTER COLUMN compensation_model DROP NOT NULL;
ALTER TABLE training_projects ALTER COLUMN compensation_rate_cents DROP NOT NULL;
ALTER TABLE training_projects ALTER COLUMN compensation_rate_cents SET DEFAULT NULL;
