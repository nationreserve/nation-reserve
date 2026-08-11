/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import type {FinancialConfig} from "@nation-reserve/financial-domain";
import {FinancialOperationsService} from "@nation-reserve/database";
import type {Pool} from "pg";import type {FinancialRouteService} from "./financial-routes.js";
const forbidden=()=>Object.assign(new Error("FORBIDDEN"),{statusCode:403,code:"FORBIDDEN"});
export class PostgresFinancialRouteService implements FinancialRouteService{
  private readonly operations:FinancialOperationsService;
  constructor(private readonly pool:Pool,config:FinancialConfig){this.operations=new FinancialOperationsService(pool,config);}
  private async member(userId:string,organizationId:string){const r=await this.pool.query(
    `SELECT role FROM organization_memberships WHERE user_id=$1 AND organization_id=$2 AND status='active'`,
    [userId,organizationId]);if(!r.rows[0])throw forbidden();}
  private async billing(userId:string){const r=await this.pool.query(`SELECT 1 FROM platform_role_assignments
    WHERE user_id=$1 AND status='active'`,[userId]);if(!r.rows[0])throw forbidden();}
  async organization(userId:string,organizationId:string,resource:string,id?:string){
    await this.member(userId,organizationId);
    const map:Record<string,string>={
      "billing-account":`SELECT b.* FROM company_billing_accounts b JOIN hiring_companies h ON h.id=b.hiring_company_id WHERE h.organization_id=$1`,
      "billing-summary":`SELECT COUNT(i.id)::integer invoice_count,COALESCE(SUM(i.amount_due_minor_units),0)::bigint amount_due_minor_units FROM company_invoices i JOIN hiring_companies h ON h.id=i.hiring_company_id WHERE h.organization_id=$1`,
      invoices:`SELECT i.* FROM company_invoices i JOIN hiring_companies h ON h.id=i.hiring_company_id WHERE h.organization_id=$1 ORDER BY i.created_at DESC`,
      invoice:`SELECT i.* FROM company_invoices i JOIN hiring_companies h ON h.id=i.hiring_company_id WHERE h.organization_id=$1 AND i.id=$2`,
      "invoice-lines":`SELECT l.* FROM company_invoice_line_items l JOIN company_invoices i ON i.id=l.invoice_id JOIN hiring_companies h ON h.id=i.hiring_company_id WHERE h.organization_id=$1 AND i.id=$2 ORDER BY l.line_number`,
      "earning-account":`SELECT * FROM robot_owner_earning_accounts WHERE robot_owner_organization_id=$1`,
      "earning-summary":`SELECT COALESCE(SUM(owner_gross_earning_minor_units),0)::bigint gross_minor_units,COALESCE(SUM(owner_platform_fee_minor_units),0)::bigint platform_fee_minor_units,COALESCE(SUM(owner_net_earning_minor_units),0)::bigint net_minor_units FROM financial_accruals WHERE robot_owner_organization_id=$1 AND status='posted'`,
      statements:`SELECT * FROM robot_owner_earnings_statements WHERE robot_owner_organization_id=$1 ORDER BY created_at DESC`,
      statement:`SELECT * FROM robot_owner_earnings_statements WHERE robot_owner_organization_id=$1 AND id=$2`,
      "statement-lines":`SELECT l.* FROM robot_owner_earnings_statement_lines l JOIN robot_owner_earnings_statements s ON s.id=l.statement_id WHERE s.robot_owner_organization_id=$1 AND s.id=$2 ORDER BY l.line_number`,
      holds:`SELECT * FROM financial_holds WHERE organization_id=$1 ORDER BY created_at DESC`,
      disputes:`SELECT * FROM financial_disputes WHERE opened_by_organization_id=$1 ORDER BY opened_at DESC`,
      dispute:`SELECT * FROM financial_disputes WHERE opened_by_organization_id=$1 AND id=$2`};
    const query=map[resource];if(!query)throw new Error("FINANCIAL_RESOURCE_UNKNOWN");
    const rows=(await this.pool.query(query,id?[organizationId,id]:[organizationId])).rows;
    return id?(rows[0]??{}):{items:rows,externalSettlement:false};
  }
  async platform(userId:string,resource:string,id?:string){await this.billing(userId);
    const table:Record<string,string>={"financial-periods":"financial_periods","financial-accruals":"financial_accruals",
      "journal-entries":"journal_entries","financial-holds":"financial_holds",
      "financial-adjustments":"financial_adjustments","financial-disputes":"financial_disputes",
      "settlement-batches":"settlement_batches","reconciliation-runs":"financial_reconciliation_runs"};
    if(resource==="overview"){const result=await this.pool.query(`SELECT
      COALESCE(SUM(company_total_charge_minor_units),0)::bigint accrued_company_minor_units,
      COALESCE(SUM(owner_net_earning_minor_units),0)::bigint owner_net_minor_units,
      COALESCE(SUM(platform_revenue_minor_units),0)::bigint platform_revenue_minor_units
      FROM financial_accruals WHERE status='posted'`);return {...result.rows[0],externalCashBalance:null};}
    const name=table[resource];if(!name)throw new Error("FINANCIAL_RESOURCE_UNKNOWN");
    return {items:(await this.pool.query(`SELECT * FROM ${name} WHERE ($1::uuid IS NULL OR id=$1)
      ORDER BY created_at DESC LIMIT 200`,[id??null])).rows};
  }
  async command(userId:string,action:string,id:string|undefined,input:any){await this.billing(userId);
    if(action==="generate-invoices")return {items:await this.operations.generateInvoices()};
    if(action==="generate-statements")return {items:await this.operations.generateStatements()};
    if(action==="issue-invoice")return this.operations.issueInvoice(userId,id!);
    if(action==="issue-statement")return this.operations.issueStatement(userId,id!);
    if(action==="place-hold")return this.operations.placeHold(userId,{scope:input.scope,scopeId:input.scopeId,
      type:input.type,amount:input.amountMinorUnits,reason:input.reason,organizationId:input.organizationId});
    if(action==="release-hold")return this.operations.releaseHold(userId,id!,input.resolution);
    if(action==="create-period")return this.operations.createPeriod(userId,{type:input.type,
      startAt:new Date(input.startAt),endAt:new Date(input.endAt),timezone:input.timezone});
    if(["start-closing","close-period","reopen-period"].includes(action))return this.operations.transitionPeriod(
      userId,id!,action==="start-closing"?"start-closing":action==="close-period"?"close":"reopen",input.reason);
    if(action==="reconcile")return this.operations.reconcile(userId,new Date(input.startAt),new Date(input.endAt));
    if(action==="prepare-settlement")return this.operations.prepareSettlement(userId,input.type,input.periodId);
    if(action==="approve-batch")return (await this.pool.query(`UPDATE settlement_batches SET status='approved',
      approved_at=now(),approved_by_user_id=$2,updated_at=now() WHERE id=$1 AND status='pending_approval'
      RETURNING *,false external_payment_execution`,[id,userId])).rows[0];
    if(action==="cancel-batch")return (await this.pool.query(`UPDATE settlement_batches SET status='cancelled',
      updated_at=now() WHERE id=$1 AND status IN ('draft','prepared','pending_approval','approved')
      RETURNING *`,[id])).rows[0];throw new Error("FINANCIAL_COMMAND_UNKNOWN");
  }
  async dispute(userId:string,organizationId:string,input:any){await this.member(userId,organizationId);
    return this.operations.openDispute(userId,organizationId,{type:input.type,invoiceId:input.invoiceId,
      statementId:input.statementId,amount:input.amountMinorUnits,reason:input.reasonCode,
      description:input.description});}
}
