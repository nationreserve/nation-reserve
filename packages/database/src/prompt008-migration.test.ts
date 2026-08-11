import{readFile}from"node:fs/promises";import{resolve}from"node:path";import{describe,expect,it}from"vitest";
describe("Prompt 008 migration",()=>{it("defines tokenized provider records and replay-safe attempts",async()=>{
 const sql=await readFile(resolve("migrations/0008_payment_execution_webhooks.sql"),"utf8");
 for(const table of["payment_provider_customers","company_payment_methods","payment_provider_connected_accounts",
 "payment_attempts","payout_attempts","payment_refunds","processor_disputes","payment_processor_events",
 "processor_balance_transactions"])expect(sql).toContain(`CREATE TABLE ${table}`);
 expect(sql).toContain("payment_attempt_invoice_active");expect(sql).toContain("provider_event_id");
 expect(sql).not.toContain("card_number");expect(sql).not.toContain("routing_number");
});});
