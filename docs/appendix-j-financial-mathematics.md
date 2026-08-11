# Nation Reserve Master Specification

# Volume I — Appendix J

# Billing & Financial Mathematics

**Version:** 1.0
**Status:** Authoritative Financial Calculation Specification

---

# Purpose

This appendix defines the exact financial rules used by RoboWorkPool for:

- Robot Owner earnings
- Hiring Company charges
- Platform fees
- Verified operating time
- Invoice calculations
- Payroll calculations
- Rounding
- Taxes
- Credits
- Refunds
- Adjustments
- Failed payments
- Financial disputes

All billing, payroll, reporting, invoices, dashboards, APIs, and accounting records must use the same formulas.

No service may independently recalculate financial values using different rules.

---

# Core Financial Model

RoboWorkPool applies a standardized **$5.00 base operating rate per verified operating hour**.

The platform charges a **15% fee to each side of the transaction**.

## Robot Owner Side

The Robot Owner begins with gross base earnings of:

```text
$5.00 × verified operating hours
```

RoboWorkPool deducts:

```text
15% of gross base earnings
```

The Robot Owner receives:

```text
85% of gross base earnings
```

## Hiring Company Side

The Hiring Company is charged:

```text
$5.00 × verified operating hours
```

plus:

```text
15% of the base operating charge
```

The Hiring Company therefore pays:

```text
115% of the base operating charge
```

---

# Per-Hour Financial Formula

For one verified operating hour:

| Financial component                 | Amount |
| ----------------------------------- | -----: |
| Base operating rate                 |  $5.00 |
| Owner-side fee                      |  $0.75 |
| Robot Owner net earnings            |  $4.25 |
| Company-side fee                    |  $0.75 |
| Hiring Company subtotal             |  $5.75 |
| Total RoboWorkPool platform revenue |  $1.50 |

Taxes, payment-processing costs, approved surcharges, refunds, or credits may alter final settlement amounts but do not change the base formula.

---

# Authoritative Constants

Initial platform constants:

```text
BASE_OPERATING_RATE = 5.00 USD
OWNER_PLATFORM_FEE_RATE = 0.15
COMPANY_PLATFORM_FEE_RATE = 0.15
OWNER_NET_RATE = 4.25 USD per verified hour
COMPANY_SUBTOTAL_RATE = 5.75 USD per verified hour
PLATFORM_REVENUE_RATE = 1.50 USD per verified hour
```

These values should be stored as versioned financial configuration rather than duplicated throughout the codebase.

Any future rate change must include:

- Effective date
- Configuration version
- Approval record
- Audit record
- Contract applicability rules
- Public and contractual notice where required

Historical transactions must retain the rate version active when the payable time was earned.

---

# Verified Operating Time

## Authoritative Source

Payable and billable time is based on verified Heartbeat API records.

Schedules, workforce plans, expected shifts, manual timesheets, or contract estimates do not independently create billable time.

## Qualifying Time

A period may count as verified operating time only when:

- The robot is registered.
- The robot belongs to an eligible Robot Owner.
- The manufacturer is approved.
- The heartbeat is authenticated and valid.
- The heartbeat references the correct serial identifier.
- The robot is in a payable operational state.
- The robot is assigned to an eligible active contract or other approved paid operating context.
- The robot is not suspended, retired, or disqualified.
- The heartbeat sequence has not already been counted.
- The time falls within allowed contract and operational rules.

## Nonqualifying Time

The following does not automatically qualify:

- Scheduled but unworked time
- Missing heartbeats
- Invalid signatures
- Duplicate heartbeat messages
- Unapproved robot operation
- Maintenance periods
- Suspended operation
- Retired robot activity
- Time outside an eligible contract window
- Test or sandbox heartbeat traffic
- Manufacturer diagnostic traffic
- Manually entered uptime without approved adjustment review

---

# Time Calculation Method

Heartbeat messages establish continuous verified intervals.

The platform should calculate payable duration between accepted heartbeat points according to the configured heartbeat tolerance.

Example:

```text
Accepted heartbeat at 10:00
Accepted heartbeat at 10:01
Accepted heartbeat at 10:02
Accepted heartbeat at 10:03
```

The qualifying interval may be treated as continuously verified when all validation and state rules are satisfied.

A missing interval exceeding the permitted tolerance ends the verified operating period.

---

# Heartbeat Tolerance

Heartbeat frequency and tolerance must be configurable by approved integration policy.

Example only:

```text
Expected heartbeat interval: 60 seconds
Temporary tolerance: 180 seconds
```

The specific production values must be established during integration and load testing.

A tolerance window is not an entitlement to payment. It exists to accommodate ordinary transmission delay and short network interruptions.

---

# Time Precision

The platform should store qualifying time internally in integer milliseconds or integer seconds.

Financial calculations should not be performed directly from floating-point hour values.

Recommended internal process:

```text
verified_seconds
÷ 3,600
= verified_hours
```

Money should be calculated using integer minor units or a decimal money library.

Do not use binary floating-point arithmetic for settlement values.

---

# Partial Hours

Verified operating time should be paid proportionally.

There is no requirement that a robot complete a full hour.

Example:

```text
30 verified minutes = 0.5 verified hours
```

Financial calculation:

```text
Base value:
0.5 × $5.00 = $2.50

Owner fee:
$2.50 × 15% = $0.375

Company fee:
$2.50 × 15% = $0.375
```

Because currencies settle in cents, rounding rules apply.

---

# Rounding Rules

## Calculation Precision

Intermediate financial values should retain at least six decimal places.

## Settlement Precision

Final invoice and payroll amounts settle to the nearest cent.

## Rounding Method

Use:

**Round half away from zero**, unless the selected payment provider or accounting standard legally requires another method.

## Aggregation Rule

Do not round each heartbeat interval separately.

Instead:

1. Sum qualifying time for the financial line item.
2. Calculate the base amount.
3. Calculate each platform fee.
4. Round each final line amount to the nearest cent.

This reduces cumulative rounding distortion.

---

# Robot Owner Payroll Formula

Let:

```text
H = verified operating hours
B = $5.00
Fₒ = 15%
```

Then:

```text
Gross Owner Earnings = H × B
Owner Platform Fee = Gross Owner Earnings × Fₒ
Owner Net Earnings = Gross Owner Earnings − Owner Platform Fee
```

Equivalent:

```text
Owner Net Earnings = H × $4.25
```

The detailed payroll record must still show the gross amount and fee separately.

---

# Hiring Company Invoice Formula

Let:

```text
H = verified operating hours
B = $5.00
F𝚌 = 15%
```

Then:

```text
Base Operating Charge = H × B
Company Platform Fee = Base Operating Charge × F𝚌
Company Subtotal = Base Operating Charge + Company Platform Fee
```

Equivalent:

```text
Company Subtotal = H × $5.75
```

The invoice must separately display:

- Verified operating hours
- Base operating charge
- Platform fee
- Credits or adjustments
- Taxes
- Final amount due

---

# Platform Revenue Formula

Before processing costs, refunds, taxes retained for authorities, or other adjustments:

```text
Platform Revenue =
Owner Platform Fee
+
Company Platform Fee
```

For each verified hour:

```text
$0.75 + $0.75 = $1.50
```

The $5.00 base value is not itself platform revenue.

It is the gross operating compensation basis used to calculate the owner’s payment.

---

# Worked Example — One Robot, Eight Hours

Verified time:

```text
8.00 hours
```

## Robot Owner

```text
Gross base earnings:
8 × $5.00 = $40.00

Owner platform fee:
$40.00 × 15% = $6.00

Owner net earnings:
$40.00 − $6.00 = $34.00
```

## Hiring Company

```text
Base operating charge:
8 × $5.00 = $40.00

Company platform fee:
$40.00 × 15% = $6.00

Company subtotal:
$40.00 + $6.00 = $46.00
```

## Platform

```text
Owner-side revenue:   $6.00
Company-side revenue: $6.00
Total revenue:       $12.00
```

---

# Worked Example — Five Robots, Forty Hours Each

Total verified hours:

```text
5 robots × 40 hours = 200 robot-hours
```

## Robot Owners

```text
Gross base earnings:
200 × $5.00 = $1,000.00

Owner platform fee:
$1,000.00 × 15% = $150.00

Net payroll:
$1,000.00 − $150.00 = $850.00
```

## Hiring Company

```text
Base operating charge:
200 × $5.00 = $1,000.00

Company platform fee:
$1,000.00 × 15% = $150.00

Company subtotal:
$1,150.00
```

## Platform

```text
Total platform revenue:
$150.00 + $150.00 = $300.00
```

---

# Worked Example — Partial-Hour Settlement

Verified time:

```text
37 minutes
```

Convert to hours:

```text
37 ÷ 60 = 0.616666...
```

Base amount:

```text
0.616666... × $5.00
= $3.083333...
```

Owner platform fee:

```text
$3.083333... × 15%
= $0.4625
→ $0.46
```

Owner net:

```text
$3.083333... − $0.4625
= $2.620833...
→ $2.62
```

Company platform fee:

```text
$3.083333... × 15%
= $0.4625
→ $0.46
```

Company subtotal:

```text
$3.083333... + $0.4625
= $3.545833...
→ $3.55
```

The system must preserve unrounded source calculations for audit and reconciliation.

---

# Financial Ledger Design

Every financial movement should create balanced ledger entries.

The ledger must distinguish:

- Company receivable
- Company payment
- Base operating liability
- Owner platform fee revenue
- Company platform fee revenue
- Owner payable
- Owner payout
- Taxes payable
- Processor fees
- Refund liability
- Credits
- Chargebacks
- Reserves
- Adjustments

Financial balances should be derived from ledger entries, not directly overwritten.

---

# Invoice Line Structure

Each Hiring Company invoice line should include:

```text
Invoice Line ID
Robot ID
Robot Serial
Contract ID
Assignment ID
Facility
Department
Service Period
Verified Seconds
Verified Hours
Base Rate
Base Operating Charge
Company Platform Fee Rate
Company Platform Fee Amount
Taxable Amount
Tax Amount
Credits
Adjustments
Line Total
Rate Configuration Version
```

The invoice may group entries by robot, assignment, facility, department, contract, or service period, but the platform must retain the detailed source records.

---

# Payroll Line Structure

Each Robot Owner payroll line should include:

```text
Payroll Line ID
Owner ID
Robot ID
Robot Serial
Contract ID
Assignment ID
Service Period
Verified Seconds
Verified Hours
Gross Base Rate
Gross Earnings
Owner Platform Fee Rate
Owner Platform Fee Amount
Adjustments
Tax Withholding, if applicable
Net Owner Earnings
Rate Configuration Version
```

---

# Billing Periods

Hiring Company billing may support:

- Weekly
- Biweekly
- Semimonthly
- Monthly
- Contract completion
- Enterprise custom terms approved by the platform

The billing period controls invoice generation timing, not verified operating-time eligibility.

---

# Payroll Periods

Robot Owner payout preferences may include:

- Weekly
- Biweekly
- Monthly

The platform may impose minimum payout thresholds or provider limitations.

Amounts below a payout threshold should remain as accrued payable balances, not disappear or become platform revenue.

---

# Invoice Generation

At the end of a billing period:

1. Close the eligible service interval.
2. Retrieve verified operating-time records.
3. Exclude disputed or disqualified records as required.
4. Aggregate time by invoice-line grouping.
5. Apply the rate version active during each interval.
6. Calculate base charges.
7. Calculate company-side fees.
8. Apply credits and approved adjustments.
9. Calculate taxes where applicable.
10. Generate the invoice.
11. Record immutable invoice source references.
12. Notify authorized company contacts.

---

# Payroll Calculation

At the end of a payroll period:

1. Retrieve verified owner-eligible operating intervals.
2. Confirm ownership for each interval.
3. Apply the applicable rate version.
4. Calculate gross base earnings.
5. Calculate owner-side platform fees.
6. Apply approved adjustments.
7. Apply legally required withholding, if applicable.
8. Calculate net payout.
9. Create payroll ledger entries.
10. Submit the payout after required funding and settlement conditions are met.
11. Notify the Robot Owner.

---

# Ownership Changes During a Pay Period

Earnings must follow the legal owner of the robot during each verified interval.

Example:

```text
Owner A owns robot through Tuesday at 2:00 PM.
Ownership transfers to Owner B at 2:00 PM.
```

Verified time before the effective transfer belongs to Owner A.

Verified time after the effective transfer belongs to Owner B.

The transfer timestamp must not retroactively reassign prior earnings unless corrected through an audited legal or administrative process.

---

# Contract Changes During a Billing Period

If contract terms or applicable financial configuration change during a billing period, the invoice must split affected time into separate line items.

Historical verified time must retain its original applicable rate.

---

# Taxes

Taxes must be calculated separately from the two platform fees.

Possible tax categories include:

- Sales tax
- Use tax
- Service tax
- Value-added tax in future jurisdictions
- Payroll withholding
- Information-reporting obligations

Tax treatment may vary by jurisdiction and party classification.

The platform must not assume that the same tax applies to both Robot Owners and Hiring Companies.

Tax calculations should be handled through a dedicated tax service or approved rules engine when available.

---

# Payment-Processing Fees

Payment-provider fees are operational expenses unless the platform explicitly and contractually passes them through.

They must not be silently added to an invoice.

Any passed-through processing fee must be:

- Legally permitted
- Disclosed before payment
- Separately itemized
- Consistently calculated
- Reflected in applicable terms

The 15% company platform fee and 15% owner platform fee are separate from payment-processing fees.

---

# Refunds

Refunds may apply when:

- Operating time was incorrectly verified.
- A robot was improperly billed.
- A duplicate payment occurred.
- A contract adjustment was approved.
- A legal or policy requirement mandates reimbursement.

Refund calculations must identify which original financial components are reversed.

Example full reversal of one hour:

```text
Hiring Company base charge reversal: −$5.00
Hiring Company platform fee reversal: −$0.75
Total company refund before taxes:    −$5.75
```

Corresponding owner adjustments depend on whether payroll was already completed.

---

# Owner Payroll Reversals

Money already paid to a Robot Owner should not be silently withdrawn.

When an overpayment is confirmed, the platform may use an approved process such as:

- Future payroll offset
- Repayment request
- Reserve deduction where contractually permitted
- Administrative write-off
- Fraud recovery process

Every recovery must be:

- Itemized
- Explained
- Audited
- Subject to dispute procedures
- Compliant with applicable law and contract terms

---

# Credits

Company credits may be issued for:

- Service interruption
- Verified billing correction
- Contract concession
- Promotional credit
- Administrative resolution

Credits must include:

- Amount
- Reason
- Authorizing user
- Related invoice or contract
- Expiration, if legally permitted
- Tax treatment
- Audit reference

Credits cannot alter original heartbeat history.

---

# Financial Adjustments

Adjustments should be additive records rather than edits to settled records.

Adjustment types may include:

- Positive company adjustment
- Negative company adjustment
- Positive owner adjustment
- Negative owner adjustment
- Platform fee correction
- Tax correction
- Time-verification correction
- Refund
- Chargeback
- Write-off

Each adjustment requires:

- Reason code
- Description
- Source record
- Amount
- Currency
- Approver
- Timestamp
- Audit event

Large or sensitive adjustments should require dual approval.

---

# Disputed Time

When verified operating time is disputed:

- Preserve the original heartbeat data.
- Mark the related financial interval as disputed.
- Prevent settlement where policy permits and settlement has not occurred.
- Continue processing unrelated undisputed time.
- Record all evidence.
- Resolve through an approved adjustment rather than altering historical data.

Disputed time should not automatically stop all payroll or billing for the affected account.

---

# Company Payment Collection

Supported methods may include:

- ACH
- Bank debit
- Credit card where appropriate
- Wire transfer
- Enterprise invoicing
- Approved prefunding

Payment method availability may vary by transaction size, country, risk level, and provider support.

---

# Funding and Settlement Relationship

Robot Owner payouts should normally be supported by collected or sufficiently secured Hiring Company funds.

The platform should define risk controls for:

- Pending ACH settlement
- Credit-card chargebacks
- Enterprise payment terms
- Failed company payments
- Reserve requirements
- Platform-funded temporary settlement

A completed robot operating interval does not mean the payment processor has already settled corresponding funds.

---

# Failed Company Payments

When a Hiring Company payment fails:

1. Mark the payment failed.
2. Notify billing contacts.
3. Retry according to payment policy.
4. Preserve the invoice balance.
5. Apply account restrictions if thresholds are exceeded.
6. Protect Robot Owner payroll according to reserve and risk policy.
7. Escalate repeated failures.
8. Audit all collection actions.

The platform should avoid retroactively invalidating legitimate verified robot operation solely because a company later fails to pay.

---

# Failed Robot Owner Payouts

When a payout fails:

1. Preserve the owner payable balance.
2. Mark the payout failed.
3. Notify the Robot Owner.
4. Request corrected payout information.
5. Retry after resolution.
6. Do not classify the unpaid amount as platform revenue.
7. Maintain the full ledger and attempt history.

---

# Chargebacks

A chargeback should create a separate financial case.

The platform must record:

- Original payment
- Disputed amount
- Reason
- Related invoice
- Supporting evidence
- Processor deadline
- Outcome
- Financial allocation

Chargebacks must not delete the original payment record.

---

# Minimum Invoice and Payout Amounts

The platform may establish:

- Minimum company invoice amount
- Minimum Robot Owner payout amount
- Automatic balance carry-forward

Thresholds must be configurable and disclosed.

Balances below the threshold should remain visible.

---

# Currency

The MVP currency is:

```text
USD
```

All records must explicitly store currency even when only USD is supported.

Future multi-currency support must not mix currencies within a single financial calculation without a defined exchange-rate process.

---

# Rate Changes

Changes to the base rate or platform fee require:

- Authorized approval
- Effective date
- Rate version
- Updated terms
- Notice policy
- Contract treatment
- Website update
- API configuration update
- Test coverage
- Audit record

Rate changes must not retroactively change settled history.

---

# Public Pricing Presentation

The public website may prominently state:

> $5 per verified operating hour

It may present the relevant 15% fee based on the audience and page context.

It is not required to advertise that both sides are charged in the same marketing statement.

However:

- Robot Owners must be told that 15% is deducted from gross base earnings before they accept applicable terms.
- Hiring Companies must be told that 15% is added to the base operating charge before they enter a paid contract.
- Statements, invoices, payroll records, and contracts must itemize the applicable fee.
- Public statements must not falsely suggest that $5.00 is the Robot Owner’s net payment.
- Public statements must not falsely suggest that $5.00 is the Hiring Company’s complete cost.

Preferred Robot Owner wording:

> Robots earn a $5 gross base rate per verified operating hour, less the applicable 15% platform fee.

Preferred Hiring Company wording:

> Hiring Company pricing includes the $5 base operating rate plus a 15% platform fee, before applicable taxes or separately disclosed charges.

The homepage may use shorter language as long as linked disclosures provide the complete terms.

---

# Financial Display Rules

Every monetary display should clearly label whether it is:

- Gross
- Net
- Estimated
- Pending
- Settled
- Taxable
- Before fees
- After fees
- Refunded
- Credited
- Disputed

Do not show an amount simply as “earnings” when it is actually gross before platform fees.

---

# Estimate Rules

Dashboard estimates must:

- Be labeled as estimates.
- Use currently verified or reasonably projected data.
- State whether the amount is gross or net.
- Update when qualifying time changes.
- Never appear as settled funds before settlement.

---

# Reconciliation

Daily reconciliation should compare:

- Verified operating records
- Invoice source records
- Payroll source records
- Ledger balances
- Payment-provider transactions
- Payout-provider transactions
- Platform fee totals
- Taxes
- Refunds
- Credits
- Chargebacks

Differences should generate operational alerts and reconciliation cases.

---

# Financial Audit Requirements

The platform must audit:

- Rate configuration changes
- Invoice generation
- Payroll calculation
- Payment attempts
- Payout attempts
- Refunds
- Credits
- Adjustments
- Chargebacks
- Tax changes
- Manual time corrections
- Account balance changes
- Settlement failures
- Administrator access to sensitive financial records

---

# Access Control

Financial permissions must follow Appendix G.

At minimum:

- Company users view only authorized company invoices.
- Robot Owners view only their own payroll.
- Support users may view limited financial context.
- Billing Administrators may issue adjustments within assigned limits.
- Larger adjustments require additional approval.
- No administrator may delete settled financial history.
- Sensitive bank and tax data must be separately protected.

---

# Required Automated Tests

Financial implementation must include tests for:

- Zero hours
- One full hour
- Partial hours
- Multiple robots
- Multiple contracts
- Ownership transfer during a period
- Rate change during a period
- Rounding boundaries
- Duplicate heartbeat exclusion
- Missing heartbeat intervals
- Suspended robot exclusion
- Refunds
- Credits
- Positive adjustments
- Negative adjustments
- Failed company payment
- Failed owner payout
- Taxes
- Chargebacks
- Ledger balancing
- Idempotent invoice generation
- Idempotent payroll generation

---

# Acceptance Criteria

This appendix is complete when:

- The $5.00 gross base operating rate is precisely defined.
- The Robot Owner’s 15% deduction is defined.
- The Hiring Company’s 15% added fee is defined.
- Robot Owner net earnings equal $4.25 per full verified hour before taxes and other lawful adjustments.
- Hiring Company subtotal equals $5.75 per full verified hour before taxes and separately disclosed charges.
- RoboWorkPool gross platform revenue equals $1.50 per full verified hour before expenses and reversals.
- Verified Heartbeat API time is the authoritative calculation source.
- Partial-hour and rounding rules are defined.
- Invoices, payroll, refunds, credits, and adjustments are specified.
- Historical financial records remain immutable.
- Both parties receive accurate fee disclosure in their own agreements and records.
- The public website is not required to market the two-sided fee structure as a single headline.

# Next Appendix

# Appendix K — Fraud Prevention & Trust Systems

This appendix will define:

- Heartbeat fraud detection
- Serial-number duplication controls
- Manufacturer authentication abuse
- False uptime reporting
- Contract and assignment fraud
- Queue manipulation
- Payment fraud
- Payroll fraud
- Ownership fraud
- Administrative abuse
- Investigations
- Evidence retention
- Suspensions
- Appeals
