import { parseApiEnv } from "@nation-reserve/config";
import { financialConfigSchema } from "@nation-reserve/financial-domain";
import { FinancialFinalizationService } from "@nation-reserve/database";
import pg from "pg";
import { PostgresWorkerInstrumentation } from "./operations-instrumentation.js";
const api=parseApiEnv(process.env),config=financialConfigSchema.parse(process.env);
const pool=new pg.Pool({connectionString:api.DATABASE_URL});
if(import.meta.url===`file://${process.argv[1]}`){
const instrumentation=new PostgresWorkerInstrumentation(pool,{workerName:"financial-worker",queueName:"financial"});
  try{
    const results=await instrumentation.run("financial-finalization",{operation:"finalize-ready-intervals"},()=>new FinancialFinalizationService(pool,config).finalizeReadyIntervals(),finalized=>({finalizedCount:finalized.length}));
    process.stdout.write(`Finalized financial intervals: ${results.length}\n`);
  }finally{await pool.end();}
}
