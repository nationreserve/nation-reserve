/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import{financialConfigSchema}from"@nation-reserve/financial-domain";import type{Pool}from"pg";
import{FinancialFinalizationService}from"./financial-service.js";import{FinancialOperationsService}from"./financial-operations.js";
export async function seedPrompt007Fixtures(pool:Pool){if(process.env.NODE_ENV==="production")
  throw new Error("Prompt 007 fixtures are development-only.");const client=await pool.connect();
  try{await client.query("BEGIN");
    await client.query(`INSERT INTO financial_periods(id,period_type,period_start_at,period_end_at,timezone,status,opened_at)
      VALUES('00000000-0000-4000-8000-000000000320','weekly',date_trunc('week',now()),
      date_trunc('week',now())+interval '7 days','UTC','open',now()),
      ('00000000-0000-4000-8000-000000000321','weekly',date_trunc('week',now())-interval '7 days',
      date_trunc('week',now()),'UTC','closed',now()-interval '14 days') ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO financial_accounts(id,account_code,account_name,account_type,owner_type,
      owner_id,currency,status,normal_balance) VALUES
      ('00000000-0000-4000-8000-000000000322','AR-DEV-COMPANY','Development Company Receivable',
       'asset','hiring_company','00000000-0000-4000-8000-000000000202','USD','active','debit'),
      ('00000000-0000-4000-8000-000000000323','AP-DEV-OWNER','Development Owner Payable',
       'liability','robot_owner','00000000-0000-4000-8000-000000000201','USD','active','credit')
      ON CONFLICT(account_code) DO NOTHING`);
    await client.query(`INSERT INTO company_billing_accounts(id,hiring_company_id,currency,billing_status,
      billing_frequency,payment_terms_days,invoice_delivery_method,billing_contact_email,purchase_order_required,
      financial_account_id) VALUES('00000000-0000-4000-8000-000000000324',
      '00000000-0000-4000-8000-000000000302','USD','active','weekly',30,'email',
      'company.admin@roboworkpool.test',false,'00000000-0000-4000-8000-000000000322')
      ON CONFLICT(hiring_company_id) DO NOTHING`);
    await client.query(`INSERT INTO robot_owner_earning_accounts(id,robot_owner_organization_id,currency,status,
      financial_account_id) VALUES('00000000-0000-4000-8000-000000000325',
      '00000000-0000-4000-8000-000000000201','USD','active','00000000-0000-4000-8000-000000000323')
      ON CONFLICT(robot_owner_organization_id) DO NOTHING`);
    await client.query(`INSERT INTO verified_operating_intervals(id,robot_id,robot_owner_organization_id,
      manufacturer_id,hiring_company_id,contract_id,contract_version_id,assignment_id,facility_id,
      financial_configuration_version_id,interval_start_at,interval_end_at,verified_duration_seconds,status,
      source_method,evidence_start_message_id,evidence_end_message_id,calculation_version,review_status,
      financial_finalization_status) VALUES('00000000-0000-4000-8000-000000000326',
      '00000000-0000-4000-8000-000000000603','00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000302',
      '00000000-0000-4000-8000-000000000306','00000000-0000-4000-8000-000000000307',
      '00000000-0000-4000-8000-000000000308','00000000-0000-4000-8000-000000000304',
      '00000000-0000-4000-8000-000000000002',date_trunc('week',now())+interval '1 hour',
      date_trunc('week',now())+interval '2 hours',3600,'closed','heartbeat_continuity',
      '00000000-0000-4000-8000-000000000314','00000000-0000-4000-8000-000000000314',1,
      'not_required','ready') ON CONFLICT(id) DO NOTHING`);
    await client.query("COMMIT");}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  const config=financialConfigSchema.parse({...process.env,SETTLEMENT_EXECUTION_ENABLED:"false"});
  await new FinancialFinalizationService(pool,config).finalizeReadyIntervals();
  const operations=new FinancialOperationsService(pool,config),invoices=await operations.generateInvoices(),
    statements=await operations.generateStatements();
  if(invoices[0]?.id)await operations.issueInvoice("00000000-0000-4000-8000-000000000101",invoices[0].id);
  if(statements[0]?.id)await operations.issueStatement("00000000-0000-4000-8000-000000000101",statements[0].id);
}
