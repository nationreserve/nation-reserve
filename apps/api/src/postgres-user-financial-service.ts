/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-return */
import type { Pool, PoolClient } from "pg";
import type { PaymentProvider } from "@nation-reserve/payments";
const fail = (code: string, statusCode = 400) =>
  Object.assign(new Error(code), { code, statusCode });
export class PostgresUserFinancialService {
  constructor(
    private readonly pool: Pool,
    private readonly provider: PaymentProvider,
    private readonly config: {
      executionEnabled: boolean;
      returnUrl: string;
      identityReturnUrl: string;
      connectReturnUrl: string;
      connectRefreshUrl: string;
      country: string;
    },
  ) {}
  private async requireVerifiedIdentity(userId: string) {
    const row = (
      await this.pool.query(
        "SELECT 1 FROM individual_identity_verifications WHERE user_id=$1 AND status='verified'",
        [userId],
      )
    ).rows[0];
    if (!row) throw fail("IDENTITY_VERIFICATION_REQUIRED", 403);
  }
  async profile(userId: string) {
    const user = (
      await this.pool.query(
        `SELECT id,email,display_name FROM users WHERE id=$1 AND status='active'`,
        [userId],
      )
    ).rows[0];
    if (!user) throw fail("USER_NOT_ELIGIBLE", 403);
    let profile = (
      await this.pool.query(`SELECT * FROM user_financial_profiles WHERE user_id=$1`, [
        userId,
      ])
    ).rows[0];
    if (!profile) {
      const remote = await this.provider.createUserCustomer({
        userId,
        email: user.email,
        name: user.display_name,
        idempotencyKey: `user-customer-${userId}`,
      });
      profile = (
        await this.pool.query(
          `INSERT INTO user_financial_profiles(user_id,stripe_customer_id,payments_enabled) VALUES($1,$2,true) ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=COALESCE(user_financial_profiles.stripe_customer_id,EXCLUDED.stripe_customer_id),updated_at=now() RETURNING *`,
          [userId, remote.id],
        )
      ).rows[0];
    }
    return this.safeProfile(profile);
  }
  async identityStatus(userId: string) {
    const row = (
      await this.pool.query(
        `SELECT id,status,last_error_code "lastErrorCode",verified_at "verifiedAt",created_at "createdAt",updated_at "updatedAt"
         FROM individual_identity_verifications WHERE user_id=$1
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      )
    ).rows[0];
    return row ?? { status: "unverified" };
  }
  async startIdentityVerification(userId: string, key: string) {
    if (!this.config.executionEnabled) throw fail("PAYMENT_EXECUTION_DISABLED", 409);
    const current = await this.identityStatus(userId);
    if (current.status === "verified") return current;
    if (current.status === "pending") return current;
    const remote = await this.provider.createIdentityVerificationSession({
      userId,
      returnUrl: this.config.identityReturnUrl,
      idempotencyKey: key,
    });
    const row = (
      await this.pool.query(
        `INSERT INTO individual_identity_verifications(
           user_id,provider,provider_environment,provider_session_id,status
         ) VALUES($1,$2,$3,$4,'pending')
         ON CONFLICT(provider,provider_environment,provider_session_id)
         DO UPDATE SET updated_at=now()
         RETURNING id,status,created_at "createdAt",updated_at "updatedAt"`,
        [userId, this.provider.name, this.provider.environment, remote.id],
      )
    ).rows[0];
    return { ...row, url: remote.url };
  }

  async paymentMethods(userId: string) {
    await this.profile(userId);
    return {
      items: (
        await this.pool.query(
          `SELECT id,payment_method_type "paymentMethodType",display_brand "brand",display_last4 "last4",expiration_month "expirationMonth",expiration_year "expirationYear",bank_name_display "bankName",status,is_default "isDefault",created_at "createdAt" FROM user_payment_methods WHERE user_id=$1 AND removed_at IS NULL ORDER BY is_default DESC,created_at DESC`,
          [userId],
        )
      ).rows,
    };
  }
  async setupPaymentMethod(userId: string, key: string) {
    const p = await this.profile(userId);
    return this.provider.createPaymentMethodSetup({
      customerId: p.stripeCustomerId,
      returnUrl: this.config.returnUrl,
      idempotencyKey: key,
    });
  }
  async confirmPaymentMethod(
    userId: string,
    providerPaymentMethodId: string,
    makeDefault: boolean,
    key: string,
  ) {
    const p = await this.profile(userId),
      method = await this.provider.retrievePaymentMethod({
        customerId: p.stripeCustomerId,
        paymentMethodId: providerPaymentMethodId,
      });
    return this.tx(async (c) => {
      const existing = (
        await c.query(
          `SELECT * FROM idempotency_records WHERE scope='user-payment-method.confirm' AND idempotency_key=$1`,
          [key],
        )
      ).rows[0];
      if (existing?.status === "completed") return existing.response_body;
      if (!existing)
        await c.query(
          `INSERT INTO idempotency_records(scope,idempotency_key,request_hash,expires_at) VALUES('user-payment-method.confirm',$1,$2,now()+interval '24 hours')`,
          [key, providerPaymentMethodId],
        );
      if (makeDefault)
        await c.query(
          `UPDATE user_payment_methods SET is_default=false,updated_at=now() WHERE user_id=$1`,
          [userId],
        );
      const row = (
        await c.query(
          `INSERT INTO user_payment_methods(user_id,provider,provider_environment,stripe_customer_id,provider_payment_method_id,payment_method_type,display_brand,display_last4,expiration_month,expiration_year,bank_name_display,status,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(provider,provider_environment,provider_payment_method_id) DO UPDATE SET status=EXCLUDED.status,is_default=EXCLUDED.is_default,updated_at=now() RETURNING *`,
          [
            userId,
            this.provider.name,
            this.provider.environment,
            p.stripeCustomerId,
            method.id,
            method.type,
            method.type === "card" ? method.brand : null,
            method.last4 ?? null,
            method.expirationMonth ?? null,
            method.expirationYear ?? null,
            method.type === "us_bank_account" ? method.brand : null,
            method.type === "us_bank_account" ? "verification_pending" : "active",
            makeDefault,
          ],
        )
      ).rows[0];
      await c.query(
        `UPDATE user_financial_profiles SET default_payment_method_id=CASE WHEN $2 THEN $1 ELSE default_payment_method_id END,default_payment_method_type=CASE WHEN $2 THEN $3 ELSE default_payment_method_type END,bank_account_linked=bank_account_linked OR $4,updated_at=now() WHERE user_id=$5`,
        [row.id, makeDefault, method.type, method.type === "us_bank_account", userId],
      );
      await this.notify(
        c,
        userId,
        method.type === "us_bank_account"
          ? "BANK_ACCOUNT_VERIFICATION_REQUIRED"
          : "PAYMENT_METHOD_ADDED",
        "Payment method connected",
        method.type === "us_bank_account"
          ? "Your bank method requires Stripe verification before use."
          : "Your payment method is ready.",
        `method:${row.id}`,
      );
      await c.query(
        `UPDATE idempotency_records SET status='completed',response_status=200,response_body=$2 WHERE scope='user-payment-method.confirm' AND idempotency_key=$1`,
        [key, JSON.stringify(row)],
      );
      return row;
    });
  }
  async setDefaultPaymentMethod(userId: string, id: string) {
    return this.tx(async (c) => {
      const row = (
        await c.query(
          `SELECT id,payment_method_type FROM user_payment_methods WHERE id=$1 AND user_id=$2 AND status='active' FOR UPDATE`,
          [id, userId],
        )
      ).rows[0];
      if (!row) throw fail("PAYMENT_METHOD_NOT_AVAILABLE", 409);
      await c.query(
        `UPDATE user_payment_methods SET is_default=(id=$1),updated_at=now() WHERE user_id=$2`,
        [id, userId],
      );
      await c.query(
        `UPDATE user_financial_profiles SET default_payment_method_id=$1,default_payment_method_type=$2,updated_at=now() WHERE user_id=$3`,
        [id, row.payment_method_type, userId],
      );
      return { id, isDefault: true };
    });
  }
  async removePaymentMethod(userId: string, id: string) {
    const row = (
      await this.pool.query(
        `UPDATE user_payment_methods SET status='removed',is_default=false,removed_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 AND NOT EXISTS(SELECT 1 FROM robot_funding_payments WHERE payment_method_id=$1 AND status IN('CREATED','REQUIRES_ACTION','PROCESSING')) RETURNING id,status`,
        [id, userId],
      )
    ).rows[0];
    if (!row) throw fail("PAYMENT_METHOD_NOT_FOUND_OR_IN_USE", 409);
    return row;
  }
  async fund(
    userId: string,
    input: {
      purpose: "DOWNPAYMENT" | "DIRECT_OWNERSHIP";
      amountCents: number;
      paymentMethodId: string;
      allocationId?: string;
      idempotencyKey: string;
    },
  ) {
    if (!this.config.executionEnabled) throw fail("PAYMENT_EXECUTION_DISABLED", 409);
    await this.requireVerifiedIdentity(userId);
    const p = await this.profile(userId),
      method = (
        await this.pool.query(
          `SELECT * FROM user_payment_methods WHERE id=$1 AND user_id=$2 AND status='active'`,
          [input.paymentMethodId, userId],
        )
      ).rows[0];
    if (!method) throw fail("PAYMENT_METHOD_NOT_AVAILABLE", 409);
    const row = (
      await this.pool.query(
        `INSERT INTO robot_funding_payments(user_id,allocation_id,purpose,status,amount_cents,payment_method_id,stripe_customer_id,idempotency_key) VALUES($1,$2,$3,'CREATED',$4,$5,$6,$7) ON CONFLICT(idempotency_key) DO UPDATE SET updated_at=now() RETURNING *`,
        [
          userId,
          input.allocationId ?? null,
          input.purpose,
          input.amountCents,
          input.paymentMethodId,
          p.stripeCustomerId,
          input.idempotencyKey,
        ],
      )
    ).rows[0];
    if (row.stripe_payment_intent_id) return row;
    await this.pool.query(
      `INSERT INTO unified_financial_ledger(user_id,allocation_id,transaction_type,amount_cents,direction,status,stripe_customer_id,idempotency_key,metadata) VALUES($1,$2,'EXTERNAL_PAYMENT_PENDING',$3,'DEBIT','PENDING',$4,$5,$6) ON CONFLICT(idempotency_key) DO NOTHING`,
      [
        userId,
        input.allocationId ?? null,
        input.amountCents,
        p.stripeCustomerId,
        `ledger:${input.idempotencyKey}`,
        JSON.stringify({ fundingPaymentId: row.id, purpose: input.purpose }),
      ],
    );
    try {
      const remote = await this.provider.createFundingPayment({
          customerId: p.stripeCustomerId,
          paymentMethodId: method.provider_payment_method_id,
          amountMinorUnits: input.amountCents,
          currency: "USD",
          idempotencyKey: input.idempotencyKey,
          metadata: {
            funding_payment_id: row.id,
            user_id: userId,
            purpose: input.purpose,
            ...(input.allocationId ? { allocation_id: input.allocationId } : {}),
          },
          returnUrl: this.config.returnUrl,
        }),
        status =
          remote.status === "requires_action"
            ? "REQUIRES_ACTION"
            : remote.status === "failed"
              ? "FAILED"
              : "PROCESSING";
      const updated = (
        await this.pool.query(
          `UPDATE robot_funding_payments SET status=$2,stripe_payment_intent_id=$3,client_action_required=$4,failure_code=$5,updated_at=now() WHERE id=$1 RETURNING *`,
          [
            row.id,
            status,
            remote.providerObjectId,
            status === "REQUIRES_ACTION",
            remote.failureCode ?? null,
          ],
        )
      ).rows[0];
      await this.notify(
        this.pool,
        userId,
        status === "FAILED" ? "DOWNPAYMENT_FAILED" : "DOWNPAYMENT_PROCESSING",
        status === "FAILED" ? "Funding payment failed" : "Funding payment processing",
        status === "FAILED"
          ? "Choose another payment method or retry before the deadline."
          : "Your balance updates only after Stripe confirms settlement.",
        `fund:${row.id}`,
      );
      return {
        ...updated,
        ...(remote.clientSecret ? { clientSecret: remote.clientSecret } : {}),
      };
    } catch (error) {
      await this.pool.query(
        `UPDATE robot_funding_payments SET status='FAILED',failure_code=$2,failed_at=now(),updated_at=now() WHERE id=$1`,
        [
          row.id,
          error instanceof Error
            ? error.message.slice(0, 100)
            : "PAYMENT_PROVIDER_ERROR",
        ],
      );
      throw error;
    }
  }
  async fundAllocation(
    userId: string,
    allocationId: string,
    paymentMethodId: string,
    idempotencyKey: string,
  ) {
    const a = (
      await this.pool.query(
        `SELECT *,GREATEST(0,(allocated_microunits*locked_unit_price_cents/1000000)-paid_amount_cents) remaining_cents FROM direct_ownership_allocations WHERE id=$1 AND assigned_user_id=$2`,
        [allocationId, userId],
      )
    ).rows[0];
    if (!a) throw fail("ALLOCATION_NOT_FOUND", 404);
    if (
      !["PAYMENT_WINDOW_OPEN", "PAYMENT_PROCESSING"].includes(a.status) ||
      new Date(a.payment_due_at) <= new Date()
    )
      throw fail("ALLOCATION_PAYMENT_WINDOW_CLOSED", 409);
    if (Number(a.remaining_cents) <= 0) throw fail("ALLOCATION_ALREADY_FUNDED", 409);
    return this.fund(userId, {
      purpose: "DIRECT_OWNERSHIP",
      amountCents: Number(a.remaining_cents),
      paymentMethodId,
      allocationId,
      idempotencyKey,
    });
  }
  async transactions(userId: string) {
    return {
      items: (
        await this.pool.query(
          `SELECT id,transaction_type "type",amount_cents "amountCents",currency,direction,status,stripe_payment_intent_id "stripePaymentIntentId",created_at "createdAt",settled_at "settledAt",metadata FROM unified_financial_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200`,
          [userId],
        )
      ).rows,
    };
  }
  async payoutOnboarding(userId: string, key: string) {
    await this.requireVerifiedIdentity(userId);
    let p = await this.profile(userId);
    if (!p.stripeConnectedAccountId) {
      const remote = await this.provider.createOwnerConnectedAccount({
        organizationId: userId,
        country: this.config.country,
        idempotencyKey: key,
      });
      const updated = await this.pool.query(
        `UPDATE user_financial_profiles SET stripe_connected_account_id=$2,stripe_account_type='express',identity_verification_status='ONBOARDING',updated_at=now() WHERE user_id=$1 RETURNING *`,
        [userId, remote.id],
      );
      p = this.safeProfile(updated.rows[0]);
    }
    return this.provider.createOwnerOnboardingLink({
      accountId: p.stripeConnectedAccountId,
      returnUrl: this.config.connectReturnUrl,
      refreshUrl: this.config.connectRefreshUrl,
    });
  }
  async refreshPayout(userId: string) {
    const p = await this.profile(userId);
    if (!p.stripeConnectedAccountId) throw fail("PAYOUT_ACCOUNT_NOT_STARTED", 409);
    const r = await this.provider.retrieveConnectedAccount({
        accountId: p.stripeConnectedAccountId,
      }),
      row = (
        await this.pool.query(
          `UPDATE user_financial_profiles SET payouts_enabled=$2,charges_enabled=$3,bank_account_linked=$2,identity_verification_status=$4,requirements_due=$5,updated_at=now() WHERE user_id=$1 RETURNING *`,
          [
            userId,
            r.payoutsEnabled,
            r.transfersEnabled,
            r.payoutsEnabled && r.transfersEnabled
              ? "VERIFIED"
              : r.detailsSubmitted
                ? "PENDING"
                : "ACTION_REQUIRED",
            JSON.stringify(r.requirements),
          ],
        )
      ).rows[0];
    return this.safeProfile(row);
  }
  async refund(
    actorUserId: string,
    fundingPaymentId: string,
    input: { amountCents: number; reason: string },
    key: string,
  ) {
    await this.admin(actorUserId);
    if (!this.config.executionEnabled) throw fail("PAYMENT_EXECUTION_DISABLED", 409);
    const reserved = await this.tx(async (c) => {
      const payment = (
        await c.query(
          `SELECT * FROM robot_funding_payments WHERE id=$1 AND status IN('SUCCEEDED','PARTIALLY_REFUNDED') AND purpose='DOWNPAYMENT' FOR UPDATE`,
          [fundingPaymentId],
        )
      ).rows[0];
      if (
        !payment ||
        Number(payment.amount_cents) - Number(payment.refunded_cents) <
          input.amountCents
      )
        throw fail("FUNDING_PAYMENT_NOT_REFUNDABLE", 409);
      const account = (
        await c.query(
          `SELECT * FROM downpayment_accounts WHERE participant_id=$1 FOR UPDATE`,
          [payment.user_id],
        )
      ).rows[0];
      if (!account || Number(account.available_cents) < input.amountCents)
        throw fail("REFUNDABLE_BALANCE_INSUFFICIENT", 409);
      const row = (
        await c.query(
          `INSERT INTO robot_funding_refunds(funding_payment_id,user_id,amount_cents,status,reason,idempotency_key,requested_by_user_id) VALUES($1,$2,$3,'REQUESTED',$4,$5,$6) ON CONFLICT(idempotency_key) DO UPDATE SET updated_at=now() RETURNING *`,
          [
            payment.id,
            payment.user_id,
            input.amountCents,
            input.reason,
            key,
            actorUserId,
          ],
        )
      ).rows[0];
      if (!row.stripe_refund_id) {
        await c.query(
          `UPDATE downpayment_accounts SET available_cents=available_cents-$2,reserved_cents=reserved_cents+$2,updated_at=now() WHERE participant_id=$1`,
          [payment.user_id, input.amountCents],
        );
        await c.query(
          `INSERT INTO unified_financial_ledger(user_id,transaction_type,amount_cents,direction,status,stripe_customer_id,stripe_payment_intent_id,idempotency_key,metadata) VALUES($1,'REFUND_PENDING',$2,'DEBIT','PENDING',$3,$4,$5,$6) ON CONFLICT(idempotency_key) DO NOTHING`,
          [
            payment.user_id,
            input.amountCents,
            payment.stripe_customer_id,
            payment.stripe_payment_intent_id,
            `refund-pending:${key}`,
            JSON.stringify({ fundingRefundId: row.id, reason: input.reason }),
          ],
        );
      }
      return { row, payment };
    });
    if (reserved.row.stripe_refund_id) return reserved.row;
    try {
      const remote = await this.provider.createRefund({
        providerPaymentId: reserved.payment.stripe_payment_intent_id,
        amountMinorUnits: input.amountCents,
        idempotencyKey: key,
      });
      return (
        await this.pool.query(
          `UPDATE robot_funding_refunds SET status=$2,stripe_refund_id=$3,failure_code=$4,updated_at=now() WHERE id=$1 RETURNING *`,
          [
            reserved.row.id,
            remote.status === "failed"
              ? "FAILED"
              : remote.status === "unknown"
                ? "UNKNOWN"
                : "PROCESSING",
            remote.providerObjectId,
            remote.failureCode ?? null,
          ],
        )
      ).rows[0];
    } catch (error) {
      await this.tx(async (c) => {
        await c.query(
          `UPDATE robot_funding_refunds SET status='FAILED',failure_code=$2,failed_at=now(),updated_at=now() WHERE id=$1`,
          [
            reserved.row.id,
            error instanceof Error
              ? error.message.slice(0, 100)
              : "REFUND_PROVIDER_ERROR",
          ],
        );
        await c.query(
          `UPDATE downpayment_accounts SET available_cents=available_cents+$2,reserved_cents=reserved_cents-$2,updated_at=now() WHERE participant_id=$1`,
          [reserved.payment.user_id, input.amountCents],
        );
        return undefined;
      });
      throw error;
    }
  }
  async reconcile(actorUserId: string) {
    await this.admin(actorUserId);
    const run = (
        await this.pool.query(
          `INSERT INTO payment_reconciliation_runs(provider,provider_environment,status,started_at) VALUES($1,$2,'running',now()) RETURNING *`,
          [this.provider.name, this.provider.environment],
        )
      ).rows[0],
      payments = await this.pool.query(
        `SELECT * FROM robot_funding_payments WHERE stripe_payment_intent_id IS NOT NULL ORDER BY created_at LIMIT 500`,
      );
    let mismatches = 0;
    for (const p of payments.rows) {
      try {
        const remote = await this.provider.retrievePayment({
            providerPaymentId: p.stripe_payment_intent_id,
          }),
          external =
            remote.status === "succeeded"
              ? "SUCCEEDED"
              : remote.status === "failed"
                ? "FAILED"
                : remote.status === "requires_action"
                  ? "REQUIRES_ACTION"
                  : "PROCESSING",
          status =
            external === p.status
              ? "MATCHED"
              : external === "SUCCEEDED" && p.status !== "SUCCEEDED"
                ? "STATUS_MISMATCH"
                : external === "FAILED" && p.status !== "FAILED"
                  ? "STATUS_MISMATCH"
                  : "MATCHED";
        if (status !== "MATCHED") mismatches++;
        const ledger = (
          await this.pool.query(
            `SELECT id,amount_cents,status FROM unified_financial_ledger WHERE stripe_payment_intent_id=$1 AND transaction_type='EXTERNAL_PAYMENT_SETTLED' LIMIT 1`,
            [p.stripe_payment_intent_id],
          )
        ).rows[0];
        await this.pool.query(
          `INSERT INTO stripe_reconciliation_items(reconciliation_run_id,stripe_transaction_id,ledger_transaction_id,amount_cents,transaction_type,status,difference_cents,resolution_notes) VALUES($1,$2,$3,$4,'ROBOT_FUNDING',$5,$6,$7)`,
          [
            run.id,
            p.stripe_payment_intent_id,
            ledger?.id ?? null,
            p.amount_cents,
            ledger ? status : "UNMATCHED_LEDGER",
            ledger
              ? Number(ledger.amount_cents) - Number(p.amount_cents)
              : Number(p.amount_cents),
            JSON.stringify({ internalStatus: p.status, externalStatus: external }),
          ],
        );
      } catch (error) {
        mismatches++;
        await this.pool.query(
          `INSERT INTO stripe_reconciliation_items(reconciliation_run_id,stripe_transaction_id,amount_cents,transaction_type,status,difference_cents,resolution_notes) VALUES($1,$2,$3,'ROBOT_FUNDING','UNMATCHED_STRIPE',$3,$4)`,
          [
            run.id,
            p.stripe_payment_intent_id,
            p.amount_cents,
            error instanceof Error ? error.message : "Stripe retrieval failed",
          ],
        );
      }
    }
    return (
      await this.pool.query(
        `UPDATE payment_reconciliation_runs SET status=$2,completed_at=now(),record_count=$3,exception_count=$4,summary=$5,updated_at=now() WHERE id=$1 RETURNING *`,
        [
          run.id,
          mismatches ? "completed_with_exceptions" : "completed",
          payments.rowCount,
          mismatches,
          JSON.stringify({ fundingPayments: payments.rowCount, mismatches }),
        ],
      )
    ).rows[0];
  }
  async platformFinance(actorUserId: string) {
    await this.admin(actorUserId);
    const [payments, refunds, disputes, ledger, reconciliation] = await Promise.all([
      this.pool.query(
        `SELECT * FROM robot_funding_payments ORDER BY created_at DESC LIMIT 200`,
      ),
      this.pool.query(
        `SELECT * FROM robot_funding_refunds ORDER BY created_at DESC LIMIT 200`,
      ),
      this.pool.query(
        `SELECT * FROM robot_funding_disputes ORDER BY created_at DESC LIMIT 200`,
      ),
      this.pool.query(
        `SELECT transaction_type,status,COUNT(*)::integer count,COALESCE(SUM(amount_cents),0)::bigint amount_cents FROM unified_financial_ledger GROUP BY transaction_type,status ORDER BY transaction_type,status`,
      ),
      this.pool.query(
        `SELECT * FROM stripe_reconciliation_items ORDER BY created_at DESC LIMIT 200`,
      ),
    ]);
    return {
      payments: payments.rows,
      refunds: refunds.rows,
      disputes: disputes.rows,
      ledger: ledger.rows,
      reconciliation: reconciliation.rows,
    };
  }
  private async admin(userId: string) {
    if (
      !(
        await this.pool.query(
          `SELECT 1 FROM platform_role_assignments WHERE user_id=$1 AND status='active' AND role IN('platform_admin','super_admin','operations')`,
          [userId],
        )
      ).rowCount
    )
      throw fail("PERMISSION_DENIED", 403);
  }
  private safeProfile(p: any) {
    return {
      id: p.id,
      userId: p.user_id,
      stripeCustomerId: p.stripe_customer_id,
      stripeConnectedAccountId: p.stripe_connected_account_id,
      stripeAccountType: p.stripe_account_type,
      paymentsEnabled: p.payments_enabled,
      payoutsEnabled: p.payouts_enabled,
      chargesEnabled: p.charges_enabled,
      bankAccountLinked: p.bank_account_linked,
      defaultPaymentMethodId: p.default_payment_method_id,
      defaultPaymentMethodType: p.default_payment_method_type,
      identityVerificationStatus: p.identity_verification_status,
      requirementsDue: p.requirements_due,
      payoutSchedule: p.payout_schedule,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  }
  private notify(
    c: { query: Pool["query"] },
    userId: string,
    type: string,
    title: string,
    body: string,
    key: string,
  ) {
    return c.query(
      `INSERT INTO notifications(user_id,channel,title,body,status,idempotency_key,notification_type,priority,is_required_transactional) VALUES($1,'in_app',$2,$3,'pending',$4,$5,'high',true) ON CONFLICT(idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
      [userId, title, body, key, type],
    );
  }
  private async tx<T>(fn: (c: PoolClient) => Promise<T>) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const value = await fn(c);
      await c.query("COMMIT");
      return value;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
