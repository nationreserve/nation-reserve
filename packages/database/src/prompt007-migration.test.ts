import {readFile} from "node:fs/promises";import {resolve} from "node:path";
import {describe,expect,it} from "vitest";
describe("Prompt 007 migration",()=>{it("defines balanced immutable financial records",async()=>{
  const sql=await readFile(resolve("migrations/0007_financial_ledger_billing_settlement.sql"),"utf8");
  for(const table of ["financial_periods","financial_accounts","journal_entries","journal_lines",
    "financial_accruals","company_invoices","robot_owner_earnings_statements","financial_holds",
    "financial_adjustments","financial_disputes","settlement_batches",
    "financial_reconciliation_runs"])expect(sql).toContain(`CREATE TABLE ${table}`);
  expect(sql).toContain("journal entry must balance");expect(sql).toContain("posted journal lines are immutable");
  expect(sql).toContain("CHECK(submitted_at IS NULL AND completed_at IS NULL)");
});});
