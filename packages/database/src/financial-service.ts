/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { calculateFinancialAllocation,type FinancialConfig } from "@nation-reserve/financial-domain";
import type { Pool } from "pg";

export class FinancialFinalizationService {
  constructor(private readonly pool:Pool,private readonly config:FinancialConfig){}
  async finalizeReadyIntervals(limit=this.config.FINANCIAL_FINALIZATION_BATCH_SIZE){
    const candidates=await this.pool.query<{id:string}>(`SELECT i.id FROM verified_operating_intervals i
      WHERE i.status='closed' AND i.verified_duration_seconds>0
      AND i.review_status IN ('not_required','approved')
      AND i.financial_finalization_status IN ('not_ready','ready')
      AND NOT EXISTS(SELECT 1 FROM operating_time_holds h WHERE h.interval_id=i.id AND h.status='active')
      ORDER BY i.interval_end_at LIMIT $1`,[limit]);
    const results=[];for(const row of candidates.rows)results.push(await this.finalizeInterval(row.id));
    return results;
  }
  async finalizeInterval(intervalId:string){
    const client=await this.pool.connect();try{await client.query("BEGIN");
      const interval=(await client.query(`SELECT i.*,f.base_rate_minor_units_per_hour,
        f.owner_platform_fee_basis_points,f.company_platform_fee_basis_points
        FROM verified_operating_intervals i JOIN financial_configuration_versions f
        ON f.id=i.financial_configuration_version_id WHERE i.id=$1 AND i.status='closed'
        AND i.verified_duration_seconds>0 AND i.review_status IN ('not_required','approved') FOR UPDATE`,
        [intervalId])).rows[0];if(!interval)throw new Error("FINANCIAL_INTERVAL_NOT_READY");
      const existing=await client.query(`SELECT * FROM financial_accruals
        WHERE verified_operating_interval_id=$1 AND status='posted'`,[intervalId]);
      if(existing.rows[0]){await client.query("COMMIT");return existing.rows[0];}
      const held=await client.query(`SELECT 1 FROM operating_time_holds WHERE interval_id=$1 AND status='active'
        UNION ALL SELECT 1 FROM financial_holds WHERE scope_id=$1 AND status='active' LIMIT 1`,[intervalId]);
      if(held.rows[0])throw new Error("FINANCIAL_INTERVAL_HELD");
      const period=(await client.query(`SELECT id FROM financial_periods WHERE status IN ('open','reopened')
        AND period_start_at<=$1 AND period_end_at>$1 ORDER BY period_start_at DESC LIMIT 1 FOR UPDATE`,
        [interval.interval_start_at])).rows[0];if(!period)throw new Error("FINANCIAL_PERIOD_NOT_FOUND");
      const amounts=calculateFinancialAllocation({verifiedDurationSeconds:interval.verified_duration_seconds,
        baseRateMinorUnitsPerHour:interval.base_rate_minor_units_per_hour,
        ownerPlatformFeeBasisPoints:interval.owner_platform_fee_basis_points,
        companyPlatformFeeBasisPoints:interval.company_platform_fee_basis_points,currency:"USD",
        calculationVersion:this.config.FINANCIAL_CALCULATION_VERSION});
      const accrualId=crypto.randomUUID(),journalId=crypto.randomUUID();
      await client.query(`INSERT INTO journal_entries(id,journal_number,entry_type,status,effective_at,
        financial_period_id,source_type,source_id,description,currency,correlation_id)
        VALUES($1,$2,'operating_time_accrual','draft',$3,$4,'verified_operating_interval',$5,
        'Verified robot operating-time accrual','USD',$6)`,[journalId,
        `RWP-JRN-${Date.now()}-${accrualId.slice(0,8)}`,interval.interval_end_at,period.id,intervalId,crypto.randomUUID()]);
      const accountRows=await client.query(`SELECT id,account_code FROM financial_accounts
        WHERE account_code=ANY($1::text[])`,[["1000","2000","4000","4010"]]);
      const accounts=new Map(accountRows.rows.map(row=>[row.account_code,row.id]));
      const lines=[[accounts.get("1000"),amounts.companyTotalChargeMinorUnits,0,"Company receivable"],
        [accounts.get("2000"),0,amounts.ownerNetEarningMinorUnits,"Robot Owner payable"],
        [accounts.get("4000"),0,amounts.companyPlatformFeeMinorUnits,"Company platform fee"],
        [accounts.get("4010"),0,amounts.ownerPlatformFeeMinorUnits,"Owner platform fee"]];
      let number=1;for(const [accountId,debit,credit,description] of lines)
        await client.query(`INSERT INTO journal_lines(journal_entry_id,financial_account_id,line_number,
          debit_minor_units,credit_minor_units,description,organization_id,robot_id,contract_id,assignment_id,
          verified_operating_interval_id,financial_configuration_version_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[journalId,accountId,number++,debit,credit,
          description,interval.hiring_company_id,interval.robot_id,interval.contract_id,
          interval.assignment_id,intervalId,interval.financial_configuration_version_id]);
      const values=[accrualId,intervalId,period.id,interval.financial_configuration_version_id,
        this.config.FINANCIAL_CALCULATION_VERSION,interval.robot_id,interval.robot_owner_organization_id,
        interval.manufacturer_id,interval.hiring_company_id,interval.contract_id,interval.contract_version_id,
        interval.assignment_id,interval.facility_id,interval.department_id,interval.verified_duration_seconds,
        amounts.companyBaseChargeMinorUnits,amounts.companyPlatformFeeMinorUnits,
        amounts.companyTotalChargeMinorUnits,amounts.ownerGrossEarningMinorUnits,
        amounts.ownerPlatformFeeMinorUnits,amounts.ownerNetEarningMinorUnits,
        amounts.platformRevenueMinorUnits,amounts.roundingAdjustmentMinorUnits,journalId];
      const accrual=(await client.query(`INSERT INTO financial_accruals(id,verified_operating_interval_id,
        financial_period_id,financial_configuration_version_id,calculation_version,robot_id,
        robot_owner_organization_id,manufacturer_id,hiring_company_id,contract_id,contract_version_id,
        assignment_id,facility_id,department_id,verified_duration_seconds,currency,
        company_base_charge_minor_units,company_platform_fee_minor_units,company_total_charge_minor_units,
        owner_gross_earning_minor_units,owner_platform_fee_minor_units,owner_net_earning_minor_units,
        platform_revenue_minor_units,rounding_adjustment_minor_units,status,journal_entry_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'USD',$16,$17,$18,$19,$20,$21,
        $22,$23,'pending',$24) RETURNING *`,values)).rows[0];
      await client.query(`UPDATE journal_entries SET status='posted',posted_at=now() WHERE id=$1`,[journalId]);
      await client.query(`UPDATE financial_accruals SET status='posted',updated_at=now() WHERE id=$1`,[accrualId]);
      await client.query(`UPDATE verified_operating_intervals SET status='finalized',
        financial_finalization_status='finalized',financial_finalized_at=now(),financial_period_id=$2,
        financial_calculation_version=$3,finalized_at=COALESCE(finalized_at,now()),updated_at=now() WHERE id=$1`,
        [intervalId,period.id,this.config.FINANCIAL_CALCULATION_VERSION]);
      await client.query("COMMIT");return accrual;
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
}
