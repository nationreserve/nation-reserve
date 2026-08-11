import{readFileSync}from"node:fs";import{describe,expect,it}from"vitest";
const sql=readFileSync(new URL("../migrations/0009_payment_operations_completion.sql",import.meta.url),"utf8");
describe("Prompt 008 completion migration",()=>{
 it("adds retry lineage, reconciliation exceptions, and notifications",()=>{expect(sql).toContain("retry_of_attempt_id");expect(sql).toContain("payment_reconciliation_exceptions");expect(sql).toContain("payment_notifications");});
 it("extends settlement execution states",()=>{expect(sql).toContain("partially_completed");expect(sql).toContain("settlement_batch_items_status_check");});
 it("guards external amounts in PostgreSQL",()=>{expect(sql).toContain("validate_external_money_amounts");expect(sql).toContain("payment amount exceeds invoice amount due");expect(sql).toContain("refund amount exceeds refundable amount");});
});