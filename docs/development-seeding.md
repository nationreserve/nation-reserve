# Development Seed Data

```bash
pnpm db:migrate
pnpm db:seed
```

The idempotent seed upserts the Nation Reserve platform organization and financial
configuration version 1: USD 5.00 gross per robot-hour, 15% Robot Owner platform fee,
and 15% Hiring Company platform fee. It appends a seed audit event.

Demo users, fleets, contracts, and assignments are deliberately not seeded; tests
must create their own isolated data.

