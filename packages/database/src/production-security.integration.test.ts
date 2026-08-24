import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "./migrations.js";

const url = process.env.TEST_DATABASE_URL;
const databaseDescribe = url ? describe : describe.skip;
let pool: Pool;

async function draft(client: PoolClient, lines: Array<[number, number]>) {
  const start = new Date(Date.now() + Math.floor(Math.random() * 1_000_000_000));
  const period = await client.query<{ id: string }>(
    `INSERT INTO financial_periods(period_type,period_start_at,period_end_at,timezone,status,opened_at)
     VALUES('custom',$1,$2,'UTC','open',now()) RETURNING id`,
    [start, new Date(start.getTime() + 60_000)],
  );
  const accounts = await client.query<{ id: string }>(
    "SELECT id FROM financial_accounts ORDER BY account_code LIMIT 2",
  );
  if (accounts.rowCount !== 2)
    throw new Error("financial account fixtures unavailable");
  const entry = await client.query<{ id: string }>(
    `INSERT INTO journal_entries(journal_number,entry_type,status,effective_at,financial_period_id,
       source_type,source_id,description,currency,correlation_id)
     VALUES($1,'integration_test','draft',now(),$2,'integration_test',$3,'integrity test','USD',$4) RETURNING id`,
    [`SEC-${randomUUID()}`, period.rows[0]!.id, randomUUID(), randomUUID()],
  );
  for (const [index, [debit, credit]] of lines.entries()) {
    await client.query(
      `INSERT INTO journal_lines(journal_entry_id,financial_account_id,line_number,debit_minor_units,credit_minor_units,description)
       VALUES($1,$2,$3,$4,$5,'integrity test')`,
      [entry.rows[0]!.id, accounts.rows[index % 2]!.id, index + 1, debit, credit],
    );
  }
  return {
    id: entry.rows[0]!.id,
    accountId: accounts.rows[0]!.id,
    periodId: period.rows[0]!.id,
  };
}

databaseDescribe("production security and accounting invariants", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await migrate(pool);
  });
  afterAll(async () => {
    await pool.end();
  });

  it("classifies and enables RLS on every public application table", async () => {
    const counts = await pool.query<{ total: string; protected: string }>(`
      SELECT count(*)::text total,count(*) FILTER(WHERE c.relrowsecurity)::text protected
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN('r','p')`);
    expect(counts.rows[0]!.protected).toBe(counts.rows[0]!.total);
    const missing =
      await pool.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','S')
      EXCEPT SELECT object_name FROM database_object_access_classification
      WHERE schema_name='public' AND object_kind<>'FUNCTION'`);
    expect(missing.rowCount).toBe(0);
  });

  it("rejects direct posted insertion", async () => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const fixture = await draft(c, [
        [100, 0],
        [0, 100],
      ]);
      await expect(
        c.query(
          `INSERT INTO journal_entries(journal_number,entry_type,status,effective_at,financial_period_id,
         source_type,source_id,description,currency,correlation_id)
         VALUES($1,'test','posted',now(),$2,'test',$3,'invalid','USD',$4)`,
          [`DIRECT-${randomUUID()}`, fixture.periodId, randomUUID(), randomUUID()],
        ),
      ).rejects.toThrow(/pre-posted/i);
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });

  it.each([
    ["one line", [[100, 0]] as Array<[number, number]>],
    [
      "unbalanced",
      [
        [100, 0],
        [0, 99],
      ] as Array<[number, number]>,
    ],
  ])("rejects %s posting", async (_label, lines) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const fixture = await draft(c, lines);
      await expect(
        c.query("UPDATE journal_entries SET status='posted' WHERE id=$1", [fixture.id]),
      ).rejects.toThrow(/balance/i);
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });

  it("allows balanced posting/reversal and rejects posted mutation", async () => {
    const c = await pool.connect();
    let posted: Awaited<ReturnType<typeof draft>>;
    try {
      await c.query("BEGIN");
      posted = await draft(c, [
        [100, 0],
        [0, 100],
      ]);
      await c.query("UPDATE journal_entries SET status='posted' WHERE id=$1", [
        posted.id,
      ]);
      await c.query("COMMIT");
    } finally {
      c.release();
    }
    for (const [sql, params] of [
      [
        "INSERT INTO journal_lines(journal_entry_id,financial_account_id,line_number,debit_minor_units,credit_minor_units,description) VALUES($1,$2,3,1,0,'invalid')",
        [posted.id, posted.accountId],
      ],
      [
        "UPDATE journal_lines SET description='invalid' WHERE journal_entry_id=$1",
        [posted.id],
      ],
      ["DELETE FROM journal_lines WHERE journal_entry_id=$1", [posted.id]],
      ["UPDATE journal_entries SET status='reversed' WHERE id=$1", [posted.id]],
    ] as Array<[string, string[]]>)
      await expect(pool.query(sql, params)).rejects.toThrow(/immutable/i);

    const reversal = await pool.connect();
    try {
      await reversal.query("BEGIN");
      const entry = await draft(reversal, [
        [100, 0],
        [0, 100],
      ]);
      await reversal.query(
        "UPDATE journal_entries SET reversal_of_entry_id=$2 WHERE id=$1",
        [entry.id, posted.id],
      );
      await reversal.query("UPDATE journal_entries SET status='posted' WHERE id=$1", [
        entry.id,
      ]);
      await reversal.query("COMMIT");
    } finally {
      await reversal.query("ROLLBACK").catch(() => undefined);
      reversal.release();
    }
  });

  it("serializes a racing line insert behind posting", async () => {
    const setup = await pool.connect(),
      posting = await pool.connect(),
      inserting = await pool.connect();
    try {
      await setup.query("BEGIN");
      const fixture = await draft(setup, [
        [100, 0],
        [0, 100],
      ]);
      await setup.query("COMMIT");
      await posting.query("BEGIN");
      await inserting.query("BEGIN");
      await inserting.query("SET LOCAL statement_timeout='5s'");
      await posting.query("UPDATE journal_entries SET status='posted' WHERE id=$1", [
        fixture.id,
      ]);
      const race = inserting.query(
        "INSERT INTO journal_lines(journal_entry_id,financial_account_id,line_number,debit_minor_units,credit_minor_units,description) VALUES($1,$2,3,1,0,'race')",
        [fixture.id, fixture.accountId],
      );
      await posting.query("COMMIT");
      await expect(race).rejects.toThrow(/immutable/i);
    } finally {
      await posting.query("ROLLBACK").catch(() => undefined);
      await inserting.query("ROLLBACK").catch(() => undefined);
      setup.release();
      posting.release();
      inserting.release();
    }
  });

  it("keeps the unified ledger append-only", async () => {
    const row = await pool.query<{ id: string }>(
      `INSERT INTO unified_financial_ledger(transaction_type,amount_cents,direction,status,idempotency_key)
       VALUES('MANUAL_ADJUSTMENT',1,'DEBIT','RECORDED',$1) RETURNING id`,
      [`security-${randomUUID()}`],
    );
    await expect(
      pool.query("UPDATE unified_financial_ledger SET status='CHANGED' WHERE id=$1", [
        row.rows[0]!.id,
      ]),
    ).rejects.toThrow(/append-only/i);
    await expect(
      pool.query("DELETE FROM unified_financial_ledger WHERE id=$1", [row.rows[0]!.id]),
    ).rejects.toThrow(/append-only/i);
  });
});
