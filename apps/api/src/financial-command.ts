/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import{parseApiEnv}from"@nation-reserve/config";import{financialConfigSchema}from"@nation-reserve/financial-domain";
import{FinancialOperationsService}from"@nation-reserve/database";import pg from"pg";
if(process.env.NODE_ENV==="production"&&process.argv.includes("simulate"))throw new Error("Financial simulator is disabled in production");
const api=parseApiEnv(process.env),config=financialConfigSchema.parse(process.env);
const pool=new pg.Pool({connectionString:api.DATABASE_URL}),service=new FinancialOperationsService(pool,config);
const command=process.argv[2],userId=process.env.FINANCIAL_DEVELOPMENT_USER_ID??
  "00000000-0000-4000-8000-000000000101";let result:unknown;
if(command==="generate-invoices")result=await service.generateInvoices();
else if(command==="generate-statements")result=await service.generateStatements();
else if(command==="reconcile"){const end=new Date(),start=new Date(end.getTime()-7*86400000);
  result=await service.reconcile(userId,start,end);}
else if(command==="prepare"){const period=await pool.query(`SELECT id FROM financial_periods
  WHERE status IN ('open','closed') ORDER BY period_end_at DESC LIMIT 1`);result=await service.prepareSettlement(
  userId,(process.env.FINANCIAL_SETTLEMENT_TYPE as"company_collection"|"owner_payout")??"company_collection",
  String(period.rows[0]?.id));}
else if(command==="simulate"){const invoices=await service.generateInvoices(),statements=await service.generateStatements();
  result={developmentOnly:true,externalPaymentExecution:false,invoices,statements};}
else throw new Error("Unknown financial command");
process.stdout.write(`${JSON.stringify(result,null,2)}\n`);await pool.end();
