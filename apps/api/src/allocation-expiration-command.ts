import {parseApiEnv} from "@nation-reserve/config";
import pg from "pg";
import {PostgresExpansionService} from "./postgres-expansion-service.js";

const config=parseApiEnv(process.env),pool=new pg.Pool({connectionString:config.DATABASE_URL});
try{
 const result=await new PostgresExpansionService(pool).expireAndReplace(new Date(),100);
 process.stdout.write(`${JSON.stringify(result)}\n`);
}finally{await pool.end();}
