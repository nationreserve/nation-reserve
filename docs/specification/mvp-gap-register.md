# MVP Gap Register

Generated for PROMPT-022. No gap below is waived.

| Gap ID | Requirement IDs | Feature | Classification | Severity | Current behavior | Required behavior | Domain | Status | Test required |
|---|---|---|---|---|---|---|---|---|---|
| GAP-022-001 | all current_mvp critical | Specification coverage | launch_blocking | critical | Strict registry contains missing evidence | Every applicable critical dimension has repository and execution evidence | specification | open | strict coverage |
| GAP-022-002 | journey-a..e | Browser acceptance | launch_blocking | critical | Existing E2E command runs a Vitest shell test | Real browser journeys with failure screenshots | frontend | open | Playwright journeys |
| GAP-022-003 | motion-training connector | Hardware integration | pilot_blocking | high | Manual upload and connector requirements exist; no supported device was exercised | Certify at least one real connector and calibration path | integration | open | hardware certification |
| GAP-022-004 | payment settlement | Processor integration | pilot_blocking | critical | Fake provider tests exist; no live/sandbox processor evidence in this environment | Processor sandbox webhook, settlement, refund, dispute, payout evidence | payments | open | processor sandbox suite |
| GAP-022-005 | migrations/backfills | Historical compatibility | launch_blocking | critical | Migration files and plan exist; no production-like PostgreSQL upgrade was executed here | Upgrade fixture, idempotent rerun, immutable-data reconciliation | database | open | PostgreSQL migration suite |
| GAP-022-006 | responsive/a11y | Manual review | pilot_blocking | high | Automated component checks exist | Manual keyboard, screen-reader, zoom and five-width browser review | frontend | open | recorded manual review |
| GAP-022-007 | performance | Performance baselines | pilot_blocking | high | k6 scaffold exists; no representative environment/data-volume run | Measured targets and results for all Prompt 022 routes | reliability | open | k6/browser profile |
| GAP-022-008 | infrastructure/release | Deployment readiness | launch_blocking | critical | Terraform and workflows are source artifacts; no cloud apply/deployment evidence | Validated plan, staging deploy, migration, smoke and rollback evidence | delivery | open | protected pipeline |
| GAP-022-009 | API-screen matrix | Authenticated screens | general_availability_blocking | high | Several screens are generic or have incomplete API evidence | Every current-MVP screen mapped to endpoint, states and authorization test | frontend/api | open | screen contract suite |
| GAP-022-010 | timeline catalog | Timeline completeness | launch_blocking | critical | Core projection exists; exhaustive entity/event/privacy recovery evidence is incomplete | All listed entities, links, redaction, export and replay verified | timeline | open | projection/privacy suite |

Each record has user, security, financial and data impact documented in the detailed audits. Owner and target resolution require project assignment; inventing either would be false evidence. Waiver status: none.
