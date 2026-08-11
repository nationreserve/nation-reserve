# RoboWorkPool Complete Product Audit and Repair

Audit date: 2026-08-10  
Overall status: **FAIL — PRODUCT GAPS REMAIN**

## 1. Overall platform status

RoboWorkPool has substantial production-oriented domain code, 36 ordered PostgreSQL migrations, authenticated APIs, role portals, immutable financial records, Stripe provider abstractions, heartbeat verification, allocation mathematics, operations tooling, and broad automated tests. It is not ready for realistic external end-to-end use yet because hosted PostgreSQL/Supabase and Stripe are unconfigured, migration 0036 has not been applied, and several visible portal areas still disclose missing backend read models.

## 2. Product understanding

Hiring Companies define real robot-labor demand and normal concurrent capacity. Approved Robot Manufacturers supply, serialize, integrate, deploy, and support compatible robots. Robot Owners fund whole or fractional capacity, including direct username allocations and chronological queue allocation. Authenticated heartbeat evidence—not schedules alone—supports verified payable time. Verified work drives Company billing, owner earnings at the configured base rate and ownership share, and applicable manufacturer settlement. Training demonstrations remain Company/Manufacturer coordination, and wearable-equipment purchases remain with third-party sellers.

## 3. Robot Owner workflow

| Step | Status | Evidence / limitation |
|---|---|---|
| Account signup, verification, login, reset | PASS in code | Account-only signup repaired; role-specific signup remains available. Live email delivery is deployment-dependent. |
| Dashboard | PARTIAL | Earnings projection is connected; inventory, queue summary, and notification projections remain incomplete. |
| Ownership education | PASS | Public and portal explanations distinguish fractions, cap, verified time, and non-guaranteed earnings. |
| Payment methods and payout account | PASS in code / BLOCKED live | Card/bank methods and Connect are distinct. Stripe credentials are missing. |
| Downpayment funding | PASS in code / BLOCKED live | Webhook-authoritative idempotent funding exists. No Stripe test-mode run was possible. |
| Queue | PASS in domain / PARTIAL UI | Chronology and transactional controls exist; authenticated owner queue projection remains incomplete. |
| Fractional ownership and 20-unit cap | PASS | Deterministic tests passed, including carry-forward and cap behavior. |
| Direct username allocation and seven-day window | PASS in code | Pending price, exact seven-day window, balance plus external remainder, expiry workers, and reminders exist. |
| Ownership/robot inventory | PARTIAL | Allocation detail exists; owner-scoped robot, assignment, and operating aggregate read models remain missing. |
| Earnings and payout | PASS in code / BLOCKED live | Financial tests pass; Connect and bank payout require Stripe configuration. |
| Refunds/disputes | PASS in code / BLOCKED live | Ledger and provider flows exist; external processor verification unavailable. |

## 4. Company Owner workflow

| Step | Status | Evidence / limitation |
|---|---|---|
| Account and company onboarding | PARTIAL | Role-specific registration exists; standalone authenticated organization creation remains incomplete. |
| Dashboard | PARTIAL | Contract/operations sections exist; some summary projections remain unavailable. |
| Billing methods, invoices, retry | PASS in code / BLOCKED live | Processor-backed routes exist; no Stripe test execution. |
| Manufacturer directory/profile/search | **FIXED — PASS in code** | Authenticated approved-manufacturer search and model profiles added. |
| Private Manufacturer messaging | **FIXED — PASS in code** | Persistent messages, unread/read state, notifications, organization audiences, and idempotent sends added. |
| Contract creation and versioning | PASS in code | Real API-backed contract form and immutable versioning exist. |
| Concurrent capacity and PO limit | PASS | Peak concurrency and over-capacity rejection tests passed. |
| Direct owner assignment/payment tracking | PASS in code | Username allocation and payment-window services exist. |
| Training coordination/equipment | PASS in code | Coordination and third-party marketplace are correctly separated from payroll. |
| Fleet, schedule, monitoring, exceptions | PARTIAL | Core APIs exist; some portal read projections and interactive controls remain incomplete. |
| Billing from verified time | PASS in code / BLOCKED live | Financial domain passes; external collection unavailable. |

## 5. Manufacturer workflow

| Step | Status | Evidence / limitation |
|---|---|---|
| Registration, profile, team | PARTIAL | Registration/onboarding exists; public profile editing and some team administration remain incomplete. |
| Dashboard | PARTIAL | Navigation and action center exist; several metrics are intentionally blank without projections. |
| Models, robots, credentials | PASS in code | Registration, unique serials, scoped credential lifecycle, and activation routes exist. |
| Company inquiries and replies | **FIXED — PASS in code** | Manufacturer conversation list/detail/reply now uses the persistent messaging API. |
| Purchase orders, price lock, fulfillment | PARTIAL | Domain and contract services exist; Manufacturer fulfillment read model remains missing. |
| Heartbeat docs/examples/timing/security | PASS in code | Node, Python, cURL, gateway guidance and deterministic heartbeat tests exist. |
| Pre-shipment verification | PARTIAL | Rules and activation records exist; complete interactive workflow was not database-tested. |
| Training coordination | PARTIAL | Training resources exist; full cross-role project workspace remains incomplete. |
| Manufacturer settlement | PASS in code / BLOCKED live | Connect/payables/transfers exist; Stripe verification unavailable. |

## 6. Company ↔ Manufacturer discovery and messaging

- Directory: implemented for authenticated Hiring Company members; only active sandbox/production-approved Manufacturers are returned.
- Profiles: business description, country, integration state, approved models, model numbers, versions, categories, and capabilities.
- Search: manufacturer name, description, and approved model name.
- Contact: Company creates a private, idempotent inquiry from the profile.
- Reply: authorized Manufacturer participants can reply through the same persistent conversation.
- Notifications: in-app notifications are inserted for all other active participants.
- Read state: latest message is stored per participant and notification records are marked read.
- Security: access requires both active organization membership and explicit conversation participation/audience membership. Unauthorized identifiers return not found.
- Context: migration 0036 adds append-only links for contracts, purchase orders, models, training projects, and inquiries.
- Live persistence: **BLOCKED BY CONFIGURATION** until migration 0036 is applied to PostgreSQL.

## 7. Cross-role contract test

The deterministic domain pieces passed separately: peak concurrent capacity, fractional allocations, 20-unit contract cap, seven-day window, $5 unit-hour earnings, and heartbeat thresholds. API/component suites cover contracts, heartbeat, payments, portals, and the repaired messaging routes. The full Test Company → Test Robotics → Stripe → Connect lifecycle was **not executed against real infrastructure** because DATABASE_URL and all Stripe/Supabase values are missing.

## 8. Dashboard/UI audit

Fixed:

- Owner and Hiring Company navigation generated nonexistent `/robot-owner/*` and `/hiring-company/*` paths. It now uses canonical `/owner/*` and `/company/*` routes.
- Statements, disputes, fulfillment, applications, settings, and support nested routes were corrected.
- Manufacturer and Conversation entries were added to appropriate role navigation.
- Company/Manufacturer messaging mock screens were replaced on canonical routes.
- Manufacturer discovery mock was replaced on the canonical Company route.
- Account registration no longer reports a fake local success.
- Invalid schema requests now return safe HTTP 400 responses instead of false internal-server errors.
- Acceptance evidence no longer regenerates mojibake.
- Conversation UI includes loading, empty, error, sending, chronological history, timestamps, unread counts, mobile wrapping, and retry-safe submission.

Remaining UI gaps:

- Owner inventory, owner assignment list, owner operating aggregates, and owner notification feed explicitly lack read APIs.
- Manufacturer work-order discovery, private opportunities, fulfillment projections, and some administration screens explicitly lack API contracts.
- Account invitation preview/decline, persistent preferences, deletion request, and some organization-creation behavior remain incomplete.
- Several operations/reporting administrator views still expose raw JSON inside diagnostic details.
- Manual browser, screen-reader, 200% zoom, and device testing remains outstanding.

## 9. Complete dashboard capability matrix

| Role | Page/capability | UI | Backend | DB | Tests | Final result | Issue/fix |
|---|---|---:|---:|---:|---:|---|---|
| Shared | Signup/login/reset/verification | PASS | PASS | PASS | PASS | PASS code | Account-only signup connected. |
| Shared | Organization selection/membership | PASS | PASS | PASS | PASS | PASS code | Live persistence blocked. |
| Shared | Invitation preview/decline | PARTIAL | FAIL | schema | PARTIAL | PARTIAL | Preview/decline contract missing. |
| Owner | Dashboard earnings | PASS | PASS | PASS | PASS | PASS code | External data unavailable. |
| Owner | Inventory/list filters | PARTIAL | FAIL | PASS | PARTIAL | PARTIAL | Owner-scoped list read model missing. |
| Owner | Direct allocation payment | PASS | PASS | PASS | PASS | PASS code | Stripe blocked. |
| Owner | Fractional ownership/cap | PASS | PASS | PASS | PASS | PASS | Deterministic tests passed. |
| Owner | Queue | PARTIAL | PASS | PASS | PASS | PARTIAL | Authenticated projection incomplete. |
| Owner | Earnings/statements/holds | PASS | PASS | PASS | PASS | PASS code | Database/Stripe blocked. |
| Owner | Payment methods/payout bank | PASS | PASS | PASS | PASS | BLOCKED | Stripe keys absent. |
| Company | Dashboard | PASS | PARTIAL | PASS | PASS | PARTIAL | Summary projections incomplete. |
| Company | Manufacturer directory | PASS | PASS | planned 0036 | PASS | PASS code | Implemented in this audit. |
| Company | Manufacturer profile/models | PASS | PASS | existing | PASS | PASS code | Implemented in this audit. |
| Company | Conversations/messages | PASS | PASS | planned 0036 | PASS | PASS code | Implemented in this audit. |
| Company | Contract creation/versioning | PASS | PASS | PASS | PASS | PASS code | Connected form. |
| Company | Capacity/PO guard | PASS | PASS | PASS | PASS | PASS | Rejects over-capacity. |
| Company | Training equipment | PASS | PASS | PASS | PASS | PASS code | Third-party checkout only. |
| Company | Fleet/live operations | PASS | PARTIAL | PASS | PASS | PARTIAL | Some read projections absent. |
| Company | Billing/invoices | PASS | PASS | PASS | PASS | BLOCKED | Stripe/database unavailable. |
| Manufacturer | Onboarding | PASS | PASS | PASS | PASS | PASS code | Approval remains required. |
| Manufacturer | Models/robots/serials | PASS | PASS | PASS | PASS | PASS code | Unique serial controls exist. |
| Manufacturer | Credentials/heartbeat | PASS | PASS | PASS | PASS | PASS code | Live device test blocked. |
| Manufacturer | Conversations/replies | PASS | PASS | planned 0036 | PASS | PASS code | Implemented in this audit. |
| Manufacturer | Work-order discovery | PARTIAL | FAIL | PARTIAL | PARTIAL | PARTIAL | Read/search contracts missing. |
| Manufacturer | Fulfillment | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | Projection missing. |
| Manufacturer | Settlement/payout | PASS | PASS | PASS | PASS | BLOCKED | Stripe Connect unavailable. |
| Platform | Finance/reconciliation | PASS | PASS | PASS | PASS | BLOCKED | Processor/database unavailable. |
| Platform | Operations/jobs/health | PASS | PASS | PASS | PASS | PASS code | Deployment monitoring unavailable. |

## 10. Payment status

- Robot Owner can pay by: reusable card/debit and eligible US bank/ACH in code; **BLOCKED live**.
- Robot Owner can receive by: Stripe Connect external bank account in code; **BLOCKED live**.
- Company can pay by: card/debit, eligible bank/ACH, and invoice collection in code; **BLOCKED live**.
- Manufacturer can receive by: Stripe Connect where platform-managed; external settlement remains representable; **BLOCKED live**.

## 11. Stripe status

- Code implemented: YES.
- Provider/domain automated tests: YES, 17 payment tests plus API financial tests passed.
- Test mode verified against Stripe: NO.
- Live configuration required: YES. All Stripe keys, webhook secret, and Connect client identifier are missing.

## 12. Supabase status

- Code implemented: YES; PostgreSQL is authoritative and Supabase is the planned hosted provider.
- Database connected: NO.
- Migrations run: NO.
- Configuration required: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TLS/network access, private buckets, and migration execution through 0036.

## 13. Business logic failures found

1. Manufacturer discovery and messaging were documented but mock-only: fixed with production API/service/UI and migration 0036.
2. Role navigation linked to nonexistent portal prefixes: fixed with canonical route registry.
3. Account-only registration produced no account: fixed with atomic user/credential/audit/outbox creation and verification.
4. Validation errors appeared as server failures: fixed globally as sanitized `VALIDATION_ERROR` HTTP 400.

## 14. UI/UX failures found

1. Dead navigation paths: fixed.
2. Manufacturer directory and conversation placeholder notices: canonical routes now connected.
3. Signup fake-success screen: replaced with real loading/error/verification success states.
4. Messaging lacked empty/loading/error/unread states: added.
5. Acceptance evidence contained broken characters: generator and fixtures repaired.

## 15. Security failures found

1. Conversation tables existed without an executable cross-organization access contract: added dual organization-audience plus explicit participant checks.
2. Message duplication risk: idempotency required for create/send.
3. Manufacturer enumeration boundary: directory requires authenticated active Hiring Company membership and returns approved Manufacturers only.
4. Validation errors: now sanitized and do not disclose schema internals.
5. Source security fixture scan passed. Live penetration and RLS tests remain blocked.

## 16. Tests

- New tests: account registration API, marketplace API, marketplace UI, canonical navigation.
- Focused repaired workflows: 21 passing tests (4 API, 13 account/marketplace UI, 2 navigation, 2 marketplace route tests included in API count).
- Existing three-role portal regression run: 52 passing.
- Critical domain runs: 56 passing; database package additionally reported 5 integration tests skipped.
- Acceptance fixture: 1 passing.
- Aggregate monorepo command: timed out at five minutes without buffered results; not counted as pass.
- Database integration, Stripe sandbox, Supabase RLS, browser E2E, and hardware heartbeat: blocked by configuration.

## 17. Files modified

- `apps/api/src/account-registration.test.ts`
- `apps/api/src/app.ts`
- `apps/api/src/auth-routes.ts`
- `apps/api/src/error-handler.ts`
- `apps/api/src/marketplace-routes.ts`
- `apps/api/src/marketplace-routes.test.ts`
- `apps/api/src/postgres-auth-service.ts`
- `apps/api/src/postgres-marketplace-service.ts`
- `apps/api/src/server.ts`
- `apps/web/src/AccountPages.tsx`
- `apps/web/src/AccountPages.test.tsx`
- `apps/web/src/MarketplacePages.tsx`
- `apps/web/src/MarketplacePages.test.tsx`
- `apps/web/src/RootApp.tsx`
- `apps/web/src/styles.css`
- `packages/application-shell/src/index.tsx`
- `packages/application-shell/src/navigation-routes.test.ts`
- `packages/database/migrations/0036_manufacturer_directory_messaging.sql`
- `scripts/acceptance/mvp.mjs`
- regenerated acceptance fixture artifacts

## 18. Database migrations

- Added `0036_manufacturer_directory_messaging.sql`.
- Migration plan validates 36 ordered migrations and classifies 0036 as high-risk requiring backup and approval.
- No migrations were applied in this environment.

## 19. Remaining manual setup

1. Use repository-required Node 22.x instead of Node 24.18.0.
2. Provision Supabase/PostgreSQL and securely set the four database/Supabase variables.
3. Back up the target database and apply migrations 0001–0036 in order.
4. Test anonymous and cross-organization denial, especially finance, conversation, training, Company, and Manufacturer records.
5. Configure private Supabase Storage buckets and signed backend access.
6. Configure Stripe test keys, payment methods, Connect, HTTPS return URLs, and signed webhooks.
7. Run card, ACH, refund, dispute, owner payout, Manufacturer transfer, and reconciliation scenarios in test mode.
8. Seed two companies, two manufacturers, and multiple owners; execute unauthorized conversation-ID tests and refresh/relogin persistence.
9. Execute the complete ten-robot lifecycle and heartbeat device simulation.
10. Complete manual accessibility, responsive browser, screen-reader, privacy, legal, and security review.

## 20. Final YES/NO checklist

`YES (code)` means implemented and automatically tested but not externally verified. `NO — configuration` means only external setup prevents verification. `NO — gap` means repository work remains.

| Question | Answer |
|---|---|
| Can a Robot Owner create an account? | YES (code) |
| Can a Robot Owner fund a down payment? | YES (code); NO — configuration for Stripe |
| Can a Robot Owner use a card? | YES (code); NO — configuration live |
| Can a Robot Owner use eligible bank/ACH? | YES (code); NO — configuration live |
| Can a Robot Owner view queue position? | NO — gap in authenticated projection |
| Can a Robot Owner purchase fractional ownership? | YES (code) |
| Does the 20-unit limit work? | YES (tested) |
| Can a Robot Owner be selected by username? | YES (code) |
| Does price remain pending until locked? | YES (tested/code) |
| Does the seven-day window start only after price lock? | YES (tested/code) |
| Can balance + external payment be combined? | YES (code); NO — configuration live |
| Does unpaid direct ownership fall to the queue? | YES (code) |
| Can a Robot Owner see ownership? | NO — allocation detail exists, but complete inventory does not |
| Can a Robot Owner see verified uptime? | NO — robot detail exists, but owner aggregates do not |
| Can a Robot Owner see earnings? | YES (code) |
| Can a Robot Owner connect a payout bank? | YES (code); NO — configuration live |
| Can a Robot Owner receive Stripe payouts? | YES (code); NO — configuration live |
| Can a Robot Owner request eligible refunds? | YES (code); NO — configuration live |
| Can a Company Owner create a company? | YES through role registration; NO — gap for standalone organization creation |
| Can Company connect card/bank methods? | YES (code); NO — configuration live |
| Can Company browse/search/open Manufacturers and models? | YES (fixed/code) |
| Can Company message a Manufacturer? | YES (fixed/code) |
| Can Manufacturer receive and reply? | YES (fixed/code) |
| Does messaging persist? | YES by PostgreSQL design; NO — configuration live |
| Are message notifications functional? | YES in-app code; email not configured |
| Are messages protected between organizations? | YES (code); NO — database integration verification blocked |
| Can Company create a contract? | YES (code) |
| Does concurrent capacity calculate correctly? | YES (tested) |
| Is over-ordering prevented? | YES (tested/code) |
| Can Company assign owner and track payment? | YES (code) |
| Can Company see queue fallback? | NO — underlying state exists, but the projection is incomplete |
| Can Company create/send a purchase order? | YES (code) |
| Can Company coordinate training data? | NO — resources exist, but the complete workspace remains |
| Can Company browse Training Equipment? | YES (code) |
| Do Training Equipment purchases remain third-party? | YES |
| Can Company view deployed robots by serial? | YES in core records; portal projection partial |
| Can Company schedule robot work? | YES (code) |
| Can Company see heartbeat status? | YES in code; NO — live heartbeat configuration |
| Can Company report repair/maintenance? | YES in code; full UI projection partial |
| Can Company see billing and pay charges? | YES in code; NO — configuration live |
| Can a Manufacturer create an account? | YES (code) |
| Can Manufacturer create a public profile? | NO — onboarding data exists, but profile editing remains incomplete |
| Can Manufacturer list robot models? | YES (code) |
| Does Manufacturer appear in Company directory? | YES when approved (fixed/code) |
| Can Manufacturer receive inquiries and reply? | YES (fixed/code) |
| Can Manufacturer receive purchase orders? | YES in code; UI projection partial |
| Can Manufacturer lock unit price? | YES (code) |
| Can Manufacturer register unique serials? | YES (code) |
| Can Manufacturer generate heartbeat credentials? | YES (code) |
| Can Manufacturer view API instructions/examples? | YES — Node, Python, cURL, gateway |
| Are 30/60/90-second heartbeat rules implemented? | YES (tested) |
| Can Manufacturer perform pre-shipment verification? | NO — rules exist, but the end-to-end UI is not verified |
| Can Company see heartbeat result? | YES in code; NO — configuration live |
| Can Manufacturer coordinate training data? | NO — the complete cross-role workspace remains incomplete |
| Is there correctly no training-worker payout? | YES |
| Can Manufacturer connect payout bank/receive settlement? | YES in code; NO — configuration live |
| Are payments, payouts, refunds connected to ledger? | YES in code; NO — configuration live |
| Are disputes handled? | YES in code; NO — configuration live |
| Does reconciliation exist? | YES in code; NO — configuration live |
| Is Supabase/Postgres persistence configured? | NO — configuration |
| Are migrations present? | YES, 36 |
| Are financial/company/manufacturer/user isolation controls present? | YES in code/schema; NO — live RLS/integration verification |
| Does every dashboard route work? | NO — gap; several routes still intentionally report missing APIs |
| Does every visible critical button work? | NO — gap; remaining incomplete portal areas are documented above |
| Are mock-only financial actions remaining? | NO — no known fake-success financial action; external execution is disabled without configuration |
| Are placeholder pages remaining? | YES — gap |
| Are strange/broken characters remaining? | NO in encoding scan |
| Is mobile navigation usable? | YES by component tests; manual device review pending |
| Are dashboard layouts balanced? | YES generally; manual visual review pending |
| Is the platform understandable and professional? | NO — public experience and core portals are strong, but incomplete portal notices remain |

## Final readiness conclusion

RoboWorkPool is ready for **external Stripe/Supabase configuration and staged test-mode integration work**, but it is **not ready for production or an unqualified realistic end-to-end acceptance run**. Apply migration 0036, configure external services, execute the blocked workflows, and close the remaining portal read-model/placeholder gaps before changing the status to pass.
