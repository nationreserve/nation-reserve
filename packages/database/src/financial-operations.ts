/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-base-to-string */
import type { FinancialConfig } from "@nation-reserve/financial-domain";
import type { Pool,PoolClient } from "pg";

const tx=async<T>(pool:Pool,work:(client:PoolClient)=>Promise<T>)=>{
  const client=await pool.connect();try{await client.query("BEGIN");const value=await work(client);
    await client.query("COMMIT");return value;}catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
};
const event=async(client:PoolClient,type:string,aggregateType:string,id:string,payload:object={})=>{
  await client.query(`INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,occurred_at,payload)
    VALUES(gen_random_uuid(),$1,$2,$3,now(),$4)`,[type,aggregateType,id,payload]);
};
export class FinancialOperationsService {
  constructor(private readonly pool:Pool,private readonly config:FinancialConfig){}
  async createPeriod(userId:string,input:{type:string;startAt:Date;endAt:Date;timezone:string}){
    void userId;
    return tx(this.pool,async client=>(await client.query(`INSERT INTO financial_periods(period_type,
      period_start_at,period_end_at,timezone,status,opened_at) VALUES($1,$2,$3,$4,'open',now()) RETURNING *`,
      [input.type,input.startAt,input.endAt,input.timezone])).rows[0]);
  }
  async transitionPeriod(userId:string,id:string,action:"start-closing"|"close"|"reopen",reason?:string){
    return tx(this.pool,async client=>{
      const period=(await client.query(`SELECT * FROM financial_periods WHERE id=$1 FOR UPDATE`,[id])).rows[0];
      if(!period)throw new Error("FINANCIAL_PERIOD_NOT_FOUND");
      if(action==="close"){
        const critical=await client.query(`SELECT 1 FROM financial_reconciliation_exceptions e
          JOIN financial_reconciliation_runs r ON r.id=e.reconciliation_run_id
          WHERE e.severity='critical' AND e.status='open' AND r.period_start_at<$2 AND r.period_end_at>$1 LIMIT 1`,
          [period.period_start_at,period.period_end_at]);
        if(critical.rows[0]&&this.config.FINANCIAL_PERIOD_CLOSE_REQUIRES_ZERO_CRITICAL_EXCEPTIONS)
          throw new Error("FINANCIAL_PERIOD_RECONCILIATION_BLOCK");
      }
      if(action==="reopen"&&!reason)throw new Error("FINANCIAL_REOPEN_REASON_REQUIRED");
      const status=action==="start-closing"?"closing":action==="close"?"closed":"reopened";
      const result=(await client.query(`UPDATE financial_periods SET status=$2,
        closing_started_at=CASE WHEN $2='closing' THEN now() ELSE closing_started_at END,
        closed_at=CASE WHEN $2='closed' THEN now() ELSE closed_at END,
        closed_by_user_id=CASE WHEN $2='closed' THEN $3 ELSE closed_by_user_id END,
        reopened_at=CASE WHEN $2='reopened' THEN now() ELSE reopened_at END,
        reopened_by_user_id=CASE WHEN $2='reopened' THEN $3 ELSE reopened_by_user_id END,
        reopen_reason=COALESCE($4,reopen_reason),updated_at=now() WHERE id=$1 RETURNING *`,
        [id,status,userId,reason??null])).rows[0];await event(client,`financial.period.${status}`,"financial_period",id);return result;
    });
  }
  async generateInvoices(){
    return tx(this.pool,async client=>{
      const groups=await client.query(`SELECT a.hiring_company_id,a.financial_period_id,a.currency,
        SUM(a.company_base_charge_minor_units)::bigint subtotal,
        SUM(a.company_platform_fee_minor_units)::bigint fee
        FROM financial_accruals a LEFT JOIN company_invoice_line_items l ON l.financial_accrual_id=a.id
        WHERE a.status='posted' AND l.id IS NULL AND NOT EXISTS(SELECT 1 FROM financial_holds h
          WHERE h.financial_accrual_id=a.id AND h.status='active')
        GROUP BY a.hiring_company_id,a.financial_period_id,a.currency`);
      const invoices=[];for(const group of groups.rows){
        const billing=(await client.query(`SELECT b.*,p.period_start_at,p.period_end_at FROM company_billing_accounts b
          JOIN financial_periods p ON p.id=$2 WHERE b.hiring_company_id=$1 AND b.billing_status='active'`,
          [group.hiring_company_id,group.financial_period_id])).rows[0];if(!billing)continue;
        const invoice=(await client.query(`INSERT INTO company_invoices(hiring_company_id,billing_account_id,
          financial_period_id,currency,status,service_period_start_at,service_period_end_at,
          subtotal_minor_units,platform_fee_minor_units,total_minor_units,amount_due_minor_units)
          VALUES($1,$2,$3,$4,'draft',$5,$6,$7,$8,$7+$8,$7+$8)
          ON CONFLICT(hiring_company_id,financial_period_id,currency) WHERE status<>'void'
          DO UPDATE SET subtotal_minor_units=EXCLUDED.subtotal_minor_units,
          platform_fee_minor_units=EXCLUDED.platform_fee_minor_units,total_minor_units=EXCLUDED.total_minor_units,
          amount_due_minor_units=EXCLUDED.amount_due_minor_units,updated_at=now() RETURNING *`,
          [group.hiring_company_id,billing.id,group.financial_period_id,group.currency,
            billing.period_start_at,billing.period_end_at,group.subtotal,group.fee])).rows[0];
        const accruals=await client.query(`SELECT a.*,r.manufacturer_serial_number FROM financial_accruals a
          JOIN robots r ON r.id=a.robot_id LEFT JOIN company_invoice_line_items l ON l.financial_accrual_id=a.id
          WHERE a.hiring_company_id=$1 AND a.financial_period_id=$2 AND a.status='posted' AND l.id IS NULL`,
          [group.hiring_company_id,group.financial_period_id]);
        let line=Number((await client.query(`SELECT COALESCE(MAX(line_number),0) n FROM company_invoice_line_items
          WHERE invoice_id=$1`,[invoice.id])).rows[0].n)+1;
        for(const a of accruals.rows)await client.query(`INSERT INTO company_invoice_line_items(invoice_id,
          line_number,line_type,description,robot_id,manufacturer_serial_number_snapshot,contract_id,
          assignment_id,facility_id,department_id,service_date,verified_duration_seconds,
          base_charge_minor_units,platform_fee_minor_units,line_total_minor_units,financial_accrual_id)
          VALUES($1,$2,'verified_robot_operation','Verified robot operation',$3,$4,$5,$6,$7,$8,
          $9::date,$10,$11,$12,$11+$12,$13)`,[invoice.id,line++,a.robot_id,a.manufacturer_serial_number,
          a.contract_id,a.assignment_id,a.facility_id,a.department_id,a.created_at,a.verified_duration_seconds,
          a.company_base_charge_minor_units,a.company_platform_fee_minor_units,a.id]);
        invoices.push(invoice);await event(client,"invoice.draft.generated","company_invoice",invoice.id);
      }return invoices;
    });
  }
  async issueInvoice(userId:string,id:string){
    return tx(this.pool,async client=>{
      const invoice=(await client.query(`SELECT i.*,b.payment_terms_days FROM company_invoices i
        JOIN company_billing_accounts b ON b.id=i.billing_account_id WHERE i.id=$1 AND i.status IN ('draft','ready')
        FOR UPDATE`,[id])).rows[0];if(!invoice)throw new Error("INVOICE_NOT_ISSUABLE");
      const totals=(await client.query(`SELECT COALESCE(SUM(base_charge_minor_units),0)::bigint subtotal,
        COALESCE(SUM(platform_fee_minor_units),0)::bigint fee,
        COALESCE(SUM(line_total_minor_units),0)::bigint total FROM company_invoice_line_items
        WHERE invoice_id=$1`,[id])).rows[0];
      if(BigInt(totals.total)!==BigInt(invoice.total_minor_units))throw new Error("INVOICE_TOTAL_MISMATCH");
      const number=`${this.config.BILLING_INVOICE_NUMBER_PREFIX}-${new Date().getUTCFullYear()}-${id.slice(0,8).toUpperCase()}`;
      const result=(await client.query(`UPDATE company_invoices SET invoice_number=$2,status='issued',
        issue_date=CURRENT_DATE,due_date=CURRENT_DATE+payment_terms_days,issued_at=now(),updated_at=now()
        FROM company_billing_accounts WHERE company_invoices.id=$1
        AND company_billing_accounts.id=company_invoices.billing_account_id RETURNING company_invoices.*`,
        [id,number])).rows[0];await event(client,"invoice.issued","company_invoice",id,{userId});return result;
    });
  }
  async generateStatements(){
    return tx(this.pool,async client=>{
      const groups=await client.query(`SELECT a.robot_owner_organization_id,a.financial_period_id,a.currency,
        SUM(a.owner_gross_earning_minor_units)::bigint gross,SUM(a.owner_platform_fee_minor_units)::bigint fee,
        SUM(a.owner_net_earning_minor_units)::bigint net FROM financial_accruals a
        LEFT JOIN robot_owner_earnings_statement_lines l ON l.financial_accrual_id=a.id
        WHERE a.status='posted' AND l.id IS NULL GROUP BY 1,2,3`);
      const statements=[];for(const g of groups.rows){
        const p=(await client.query(`SELECT * FROM financial_periods WHERE id=$1`,[g.financial_period_id])).rows[0];
        const statement=(await client.query(`INSERT INTO robot_owner_earnings_statements(
          robot_owner_organization_id,financial_period_id,currency,status,period_start_at,period_end_at,
          gross_earning_minor_units,platform_fee_minor_units,net_earning_minor_units)
          VALUES($1,$2,$3,'draft',$4,$5,$6,$7,$8)
          ON CONFLICT(robot_owner_organization_id,financial_period_id,currency) WHERE status<>'void'
          DO UPDATE SET gross_earning_minor_units=EXCLUDED.gross_earning_minor_units,
          platform_fee_minor_units=EXCLUDED.platform_fee_minor_units,
          net_earning_minor_units=EXCLUDED.net_earning_minor_units,updated_at=now() RETURNING *`,
          [g.robot_owner_organization_id,g.financial_period_id,g.currency,p.period_start_at,p.period_end_at,
            g.gross,g.fee,g.net])).rows[0];
        const accruals=await client.query(`SELECT a.*,r.manufacturer_serial_number FROM financial_accruals a
          JOIN robots r ON r.id=a.robot_id LEFT JOIN robot_owner_earnings_statement_lines l ON l.financial_accrual_id=a.id
          WHERE a.robot_owner_organization_id=$1 AND a.financial_period_id=$2 AND a.status='posted' AND l.id IS NULL`,
          [g.robot_owner_organization_id,g.financial_period_id]);let line=1;
        for(const a of accruals.rows)await client.query(`INSERT INTO robot_owner_earnings_statement_lines(
          statement_id,line_number,robot_id,manufacturer_serial_number_snapshot,contract_id,assignment_id,
          service_date,verified_duration_seconds,gross_earning_minor_units,platform_fee_minor_units,
          net_earning_minor_units,hold_status,financial_accrual_id) VALUES($1,$2,$3,$4,$5,$6,$7::date,
          $8,$9,$10,$11,'none',$12)`,[statement.id,line++,a.robot_id,a.manufacturer_serial_number,
          a.contract_id,a.assignment_id,a.created_at,a.verified_duration_seconds,
          a.owner_gross_earning_minor_units,a.owner_platform_fee_minor_units,a.owner_net_earning_minor_units,a.id]);
        statements.push(statement);await event(client,"owner.statement.draft.generated","owner_statement",statement.id);
      }return statements;
    });
  }
  async issueStatement(userId:string,id:string){
    return tx(this.pool,async client=>{
      const statement=(await client.query(`SELECT * FROM robot_owner_earnings_statements
        WHERE id=$1 AND status IN ('draft','ready') FOR UPDATE`,[id])).rows[0];
      if(!statement)throw new Error("STATEMENT_NOT_ISSUABLE");
      const number=`${this.config.EARNINGS_STATEMENT_NUMBER_PREFIX}-${new Date().getUTCFullYear()}-${id.slice(0,8).toUpperCase()}`;
      const result=(await client.query(`UPDATE robot_owner_earnings_statements SET statement_number=$2,
        status='issued',issued_at=now(),updated_at=now() WHERE id=$1 RETURNING *`,[id,number])).rows[0];
      await event(client,"owner.statement.issued","owner_statement",id,{userId});return result;
    });
  }
  async placeHold(userId:string,input:{scope:string;scopeId:string;type:string;amount:number;reason:string;organizationId?:string}){
    return tx(this.pool,async client=>{
      const hold=(await client.query(`INSERT INTO financial_holds(hold_scope,scope_id,organization_id,
        hold_type,status,amount_minor_units,currency,reason,placed_by_user_id,placed_at)
        VALUES($1,$2,$3,$4,'active',$5,'USD',$6,$7,now()) RETURNING *`,[input.scope,input.scopeId,
        input.organizationId??null,input.type,input.amount,input.reason,userId])).rows[0];
      await event(client,"financial.hold.placed","financial_hold",hold.id);return hold;
    });
  }
  async releaseHold(userId:string,id:string,resolution:string){
    return tx(this.pool,async client=>{
      const result=(await client.query(`UPDATE financial_holds SET status='released',released_at=now(),
        released_by_user_id=$2,resolution=$3,updated_at=now() WHERE id=$1 AND status='active' RETURNING *`,
        [id,userId,resolution])).rows[0];if(!result)throw new Error("FINANCIAL_HOLD_NOT_ACTIVE");
      await event(client,"financial.hold.released","financial_hold",id);return result;
    });
  }
  async openDispute(userId:string,organizationId:string,input:{type:string;invoiceId?:string;statementId?:string;
    amount:number;reason:string;description:string}){
    return tx(this.pool,async client=>{
      const dispute=(await client.query(`INSERT INTO financial_disputes(dispute_type,status,opened_by_user_id,
        opened_by_organization_id,invoice_id,statement_id,amount_disputed_minor_units,currency,reason_code,
        description,opened_at) VALUES($1,'open',$2,$3,$4,$5,$6,'USD',$7,$8,now()) RETURNING *`,
        [input.type,userId,organizationId,input.invoiceId??null,input.statementId??null,input.amount,
          input.reason,input.description])).rows[0];await event(client,"financial.dispute.opened",
          "financial_dispute",dispute.id);return dispute;
    });
  }
  async reconcile(userId:string,start:Date,end:Date){
    return tx(this.pool,async client=>{
      const run=(await client.query(`INSERT INTO financial_reconciliation_runs(reconciliation_type,status,
        period_start_at,period_end_at,started_at,started_by_user_id)
        VALUES('operating_time_to_accrual','running',$1,$2,now(),$3) RETURNING *`,[start,end,userId])).rows[0];
      const missing=await client.query(`SELECT i.id FROM verified_operating_intervals i
        LEFT JOIN financial_accruals a ON a.verified_operating_interval_id=i.id AND a.status='posted'
        WHERE i.financial_finalization_status='finalized' AND i.interval_start_at>=$1
          AND i.interval_start_at<$2 AND a.id IS NULL`,[start,end]);
      for(const row of missing.rows)await client.query(`INSERT INTO financial_reconciliation_exceptions(
        reconciliation_run_id,exception_type,severity,resource_type,resource_id,status)
        VALUES($1,'finalized_interval_without_accrual','critical','verified_operating_interval',$2,'open')`,
        [run.id,row.id]);
      const result=(await client.query(`UPDATE financial_reconciliation_runs SET status=$2,
        completed_at=now(),record_count=$3,exception_count=$4,summary=$5,updated_at=now()
        WHERE id=$1 RETURNING *`,[run.id,missing.rowCount?"completed_with_exceptions":"completed",
        missing.rowCount,missing.rowCount,{externalMoneyMovement:false}])).rows[0];return result;
    });
  }
  async prepareSettlement(userId:string,type:"company_collection"|"owner_payout",periodId:string){
    return tx(this.pool,async client=>{
      const id=crypto.randomUUID(),number=`${this.config.SETTLEMENT_BATCH_NUMBER_PREFIX}-${id.slice(0,8).toUpperCase()}`;
      await client.query(`INSERT INTO settlement_batches(id,batch_number,batch_type,currency,
        status,financial_period_id,prepared_at,prepared_by_user_id)
        VALUES($1,$2,$3,'USD','prepared',$4,now(),$5)`,[id,number,type,periodId,userId]);
      if(type==="company_collection")await client.query(`INSERT INTO settlement_batch_items(settlement_batch_id,
        item_type,organization_id,invoice_id,financial_account_id,amount_minor_units,currency,status)
        SELECT $1,'invoice_collection',h.organization_id,i.id,b.financial_account_id,i.amount_due_minor_units,
        'USD',CASE WHEN EXISTS(SELECT 1 FROM financial_holds fh WHERE fh.invoice_id=i.id AND fh.status='active')
        THEN 'held' ELSE 'ready' END FROM company_invoices i JOIN hiring_companies h ON h.id=i.hiring_company_id
        JOIN company_billing_accounts b ON b.id=i.billing_account_id WHERE i.financial_period_id=$2
        AND i.status='issued' AND i.amount_due_minor_units>0`,[id,periodId]);
      else await client.query(`INSERT INTO settlement_batch_items(settlement_batch_id,item_type,
        organization_id,statement_id,financial_account_id,amount_minor_units,currency,status)
        SELECT $1,'owner_payout',s.robot_owner_organization_id,s.id,a.financial_account_id,
        s.net_earning_minor_units-s.held_minor_units,'USD',CASE WHEN s.held_minor_units>0 THEN 'held' ELSE 'ready' END
        FROM robot_owner_earnings_statements s JOIN robot_owner_earning_accounts a
        ON a.robot_owner_organization_id=s.robot_owner_organization_id WHERE s.financial_period_id=$2
        AND s.status='issued'`,[id,periodId]);
      const result=(await client.query(`UPDATE settlement_batches b SET total_item_count=x.count,
        total_amount_minor_units=x.total,status='pending_approval',updated_at=now()
        FROM(SELECT COUNT(*)::integer count,COALESCE(SUM(amount_minor_units) FILTER(WHERE status='ready'),0)::bigint total
        FROM settlement_batch_items WHERE settlement_batch_id=$1)x WHERE b.id=$1 RETURNING b.*`,[id])).rows[0];
      return {...result,externalPaymentExecution:false};
    });
  }
}

export function financialCsv(rows:Record<string,unknown>[]){
  const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
  const cell=(value:unknown)=>{let text=value===null||value===undefined?"":String(value);
    if(/^[=+\-@]/.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`;};
  return [columns.map(cell).join(","),...rows.map(row=>columns.map(column=>cell(row[column])).join(","))].join("\r\n");
}
