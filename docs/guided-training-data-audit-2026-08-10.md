# Guided Training-Data Workflow Audit

Date: 2026-08-10

Scope: Manufacturer requirement decision through equipment recommendation, Company readiness and capture, private versioned upload, Manufacturer review, revision, final approval, contract gate, notifications, authorization, retention, and access logging.

## Tier 2 required scenario

| Step | Result | Evidence |
|---|---|---|
| Company contract and selected Manufacturer/model create a requirement | PASS | Relationship-checked `createRequirement` command |
| Manufacturer selects `TRAINING_DATA_REQUIRED` and Tier 2 | PASS | Validated decision API and route test |
| Camera glasses and wrist/arm streams produce compatible recommendations | PASS | Stream-to-catalog recommendation and Tier 2 UI test |
| Company receives prompt and opens the saved workflow | PASS | Organization notification, dashboard warning, deep link |
| Purchase leaves for independent seller and state survives return | PASS | External `noopener` link; acquisition is persisted separately |
| Company records purchased/already-owned/alternative equipment | PASS | Equipment-selection command and controls |
| Company completes calibration/readiness and test capture | PASS | Versioned readiness plus persistent sample capture state |
| Manufacturer reviews sample and requests a targeted change | PASS | Structured accepted/redo stream fields and additional-recording count |
| Company sees feedback and submits a revision | PASS | Feedback display, parent version, immutable version history |
| Company performs guided full capture | PASS | Start/pause/resume/end/cancel plus problem/privacy events |
| Company uploads through RoboWorkPool private storage | PASS | Signed PUT, private stored object, validation gate, retry-safe draft |
| Manufacturer securely opens data | PASS | Relationship authorization, clean-file check, five-minute signed GET, immutable access log |
| Manufacturer approves final data | PASS | Review command sets `TRAINING_DATA_APPROVED` |
| Company sees completion and contract proceeds | PASS | Completion state and contract `DATA_APPROVED` gate |

The automated scenario is deterministic at the API-contract and portal levels. A deployed-environment storage transfer and malware-worker smoke test still belongs in release validation because it requires configured PostgreSQL, object storage, and worker credentials.

## Required YES/NO checklist

| Question | Answer |
|---|---|
| Can Manufacturer decide whether new training data is required? | YES |
| Can Manufacturer specify exactly what training data is needed? | YES |
| Can Manufacturer select required wearable/data types? | YES |
| Does RoboWorkPool convert requirements into a recommended kit? | YES |
| Is Company prompted to buy only when required? | YES |
| Does Company see the correct tier and reference prices? | YES |
| Do purchases remain third-party and outside platform payment processing? | YES |
| Is setup state preserved across an external seller visit? | YES |
| Can Company record purchased, already-owned, or alternative equipment? | YES |
| Is setup guided, including calibration and synchronization? | YES |
| Can Company submit a test capture? | YES |
| Can Manufacturer approve or request setup changes? | YES |
| Can Company run the full guided demonstration? | YES |
| Can Company upload through RoboWorkPool? | YES |
| Is data private and limited to the authorized relationship? | YES |
| Does Manufacturer receive and securely open the data? | YES |
| Can Manufacturer request targeted changes? | YES |
| Can Company upload revisions without repeating accepted streams? | YES |
| Is immutable version and review history maintained? | YES |
| Can Manufacturer approve final training data? | YES |
| Does Company see completion? | YES |
| Does approval update the contract training gate? | YES |
| Is there correctly no training-worker payout system? | YES |
| Does RoboWorkPool avoid processing seller payments? | YES |

## Security and operational controls

- Stored objects remain private; files must be available and malware-clean before submission or download.
- Both Company and Manufacturer access is checked server-side against the requirement relationship.
- Downloads use five-minute signed URLs and create immutable access-log entries.
- Capture events, file-version links, reviews, and access records are append-only.
- Requirements carry a retention-policy record; underlying stored objects support retention dates, controlled deletion, and legal-hold workflows.
- Storage and service secrets remain in the server dependency layer.
- Existing multipart storage tables provide resumable-transfer state where the configured storage provider supports it.

## Verification

- API TypeScript check: PASS
- Web TypeScript check: PASS
- Guided API tests: PASS, 4/4
- Guided portal tests: PASS, 2/2
- Environment warning: local runtime is Node 24; repository policy requires Node 22.x.
