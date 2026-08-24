-- Version 1 is production reference data, not demo/transactional seed data.
-- Runtime financial calculations require an active configuration after migrations.
INSERT INTO financial_configuration_versions(
  id,
  version,
  currency,
  base_rate_minor_units_per_hour,
  owner_platform_fee_basis_points,
  company_platform_fee_basis_points,
  effective_at,
  status
) VALUES (
  '00000000-0000-4000-8000-000000000002',
  1,
  'USD',
  500,
  1500,
  1500,
  '2026-01-01T00:00:00Z',
  'active'
)
ON CONFLICT (version) DO NOTHING;

-- Never silently accept a conflicting version-1 definition on an upgraded
-- development or staging database.
DO $initial_financial_configuration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM financial_configuration_versions
    WHERE id = '00000000-0000-4000-8000-000000000002'
      AND version = 1
      AND currency = 'USD'
      AND base_rate_minor_units_per_hour = 500
      AND owner_platform_fee_basis_points = 1500
      AND company_platform_fee_basis_points = 1500
      AND effective_at = '2026-01-01T00:00:00Z'::timestamptz
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'financial configuration version 1 conflicts with the canonical RoboWorkPool definition';
  END IF;
END
$initial_financial_configuration$;

