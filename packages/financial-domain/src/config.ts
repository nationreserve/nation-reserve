import { z } from "zod";
export const financialConfigSchema=z.object({
  FINANCIAL_CALCULATION_VERSION:z.coerce.number().int().positive().default(1),
  FINANCIAL_ROUNDING_MODE:z.literal("half_up").default("half_up"),
  FINANCIAL_DEFAULT_CURRENCY:z.literal("USD").default("USD"),
  FINANCIAL_FINALIZATION_WORKER_INTERVAL_SECONDS:z.coerce.number().int().positive().default(60),
  FINANCIAL_FINALIZATION_BATCH_SIZE:z.coerce.number().int().positive().max(1000).default(100),
  BILLING_DEFAULT_FREQUENCY:z.enum(["weekly","semimonthly","monthly","manual"]).default("weekly"),
  BILLING_DEFAULT_PAYMENT_TERMS_DAYS:z.coerce.number().int().nonnegative().default(30),
  BILLING_INVOICE_NUMBER_PREFIX:z.string().min(1).default("RWP-INV"),
  BILLING_INVOICE_GENERATION_TIME:z.string().default("02:00"),
  EARNINGS_STATEMENT_FREQUENCY:z.enum(["weekly","semimonthly","monthly"]).default("weekly"),
  EARNINGS_STATEMENT_NUMBER_PREFIX:z.string().min(1).default("RWP-STM"),
  FINANCIAL_ADJUSTMENT_APPROVAL_THRESHOLD_MINOR_UNITS:z.coerce.number().int().nonnegative().default(10000),
  FINANCIAL_REQUIRE_SEPARATE_ADJUSTER_APPROVER:z.coerce.boolean().default(true),
  SETTLEMENT_BATCH_NUMBER_PREFIX:z.string().min(1).default("RWP-SET"),
  SETTLEMENT_EXECUTION_ENABLED:z.coerce.boolean().default(false),
  FINANCIAL_RECONCILIATION_SCHEDULE:z.string().default("0 3 * * *"),
  FINANCIAL_PERIOD_CLOSE_REQUIRES_ZERO_CRITICAL_EXCEPTIONS:z.coerce.boolean().default(true),
}).superRefine((value,context)=>{
  if(value.SETTLEMENT_EXECUTION_ENABLED)context.addIssue({code:"custom",
    path:["SETTLEMENT_EXECUTION_ENABLED"],message:"External settlement execution is unavailable in Prompt 007"});
});
export type FinancialConfig=z.infer<typeof financialConfigSchema>;
