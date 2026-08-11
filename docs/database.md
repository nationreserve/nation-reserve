# Database Development

RoboWorkPool uses PostgreSQL and Drizzle ORM. The authoritative initial migration is
`packages/database/migrations/0001_core_domain.sql`; `schema.ts` is its typed mapping.
Never edit an applied migration. Add a numbered migration; checksums detect drift.

```bash
pnpm db:migrate
pnpm db:seed
pnpm test:integration
```

Migration and seed commands use `DATABASE_URL`. Integration tests use
`TEST_DATABASE_URL` and skip when absent. `db:reset` requires a non-production
environment and `ALLOW_DATABASE_RESET=true`.

Transactions, keys, indexes, GiST exclusion constraints, and optimistic
`state_version` updates protect concurrent operations. Audits are append-only.
Domain events enter `outbox_events` with business writes; workers claim rows using
`FOR UPDATE SKIP LOCKED`.

Money uses integer minor units and basis points. Version 1 is USD 500/hour with
1500 basis points on each fee side. Contracts retain their configuration version.

