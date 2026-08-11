# Nation Reserve Master Specification

# Volume I — Appendix G

# Roles & Permissions Matrix

**Version:** 1.0
**Status:** Authoritative Authorization Specification

---

# Purpose

This appendix defines every role in RoboWorkPool and exactly what each role is authorized to do.

The goals are to:

- Enforce least-privilege security.
- Prevent unauthorized actions.
- Support auditing and compliance.
- Enable future enterprise expansion.
- Provide a consistent authorization model across the platform.

Every protected action in RoboWorkPool should reference this appendix.

---

# Authorization Principles

The platform should implement:

- Role-Based Access Control (RBAC)
- Resource ownership validation
- Least-privilege access
- Complete audit logging for privileged actions
- Explicit permission checks at the API and UI levels

Permissions should never rely solely on hiding UI elements; every backend endpoint must independently enforce authorization.

---

# Role Categories

There are two primary role groups:

## Platform Roles

Managed by Nation Reserve.

- Support Specialist
- Operations Administrator
- Billing Administrator
- Security Administrator
- Platform Administrator
- Super Administrator

These roles apply across the entire platform.

---

## Organization Roles

Assigned within an organization.

Robot Owner Organization

- Robot Owner

Hiring Company

- Company Employee
- Company Supervisor
- Company Manager
- Company Administrator

Manufacturer

- Manufacturer Viewer
- Manufacturer Engineer
- Manufacturer Manager
- Manufacturer Administrator

---

# Robot Owner

Purpose:

Own and manage robots that generate verified operating income.

Permissions:

✅ View own robots

✅ Register delivered robots

✅ View heartbeat status

✅ View contracts involving owned robots

✅ View payroll

✅ View queue position

✅ Submit maintenance requests

✅ Transfer ownership (subject to approval)

✅ Retire owned robots

✅ Manage personal settings

Cannot:

❌ View other owners

❌ Edit heartbeat records

❌ Change verified hours

❌ Approve contracts for companies

❌ Modify billing calculations

❌ Access administrator functions

---

# Company Employee

Purpose:

Day-to-day operational user.

Permissions:

✅ View assigned facilities

✅ View robot assignments

✅ View schedules

✅ Report robot issues

✅ View invoices

Cannot:

❌ Create contracts

❌ Modify company settings

❌ Manage permissions

❌ Approve invoices

❌ Change billing

---

# Company Supervisor

Additional permissions:

✅ Create workforce plans

✅ Manage departments

✅ View reports

✅ Create draft contracts

Cannot:

❌ Approve final contracts

❌ Manage company administrators

---

# Company Manager

Additional permissions:

✅ Create contracts

✅ Approve contracts

✅ Cancel contracts

✅ Manage facilities

✅ Manage departments

✅ Approve workforce plans

✅ View analytics

Cannot:

❌ Delete company

❌ Assign Company Administrators

---

# Company Administrator

Highest role within a Hiring Company.

Additional permissions:

✅ Manage company users

✅ Assign company roles

✅ Billing settings

✅ Payment methods

✅ Tax settings

✅ Company profile

✅ Contract approval

✅ Invoice approval

Cannot:

❌ Access platform administration

---

# Manufacturer Viewer

Permissions:

✅ View robot fleet

✅ View models

✅ View documentation

✅ View heartbeat health

Cannot:

❌ Register robots

❌ Modify firmware

❌ Rotate API keys

---

# Manufacturer Engineer

Additional permissions:

✅ Register robots

✅ Register robot models

✅ View heartbeat diagnostics

✅ Test sandbox integration

✅ Upload firmware

Cannot:

❌ Rotate production credentials

❌ Manage organization users

---

# Manufacturer Manager

Additional permissions:

✅ Approve production deployments

✅ Manage firmware releases

✅ Review integration status

✅ Manage robot catalog

Cannot:

❌ Manage API ownership

---

# Manufacturer Administrator

Highest manufacturer role.

Permissions:

✅ Manage users

✅ Rotate API credentials

✅ Sandbox management

✅ Production API management

✅ Integration settings

✅ Security settings

---

# Support Specialist

Purpose:

Assist customers without administrative authority.

Permissions:

✅ View support tickets

✅ Respond to tickets

✅ View robot information

✅ View invoices

✅ View queue

Cannot:

❌ Change financial records

❌ Override contracts

❌ Suspend accounts

❌ Modify permissions

---

# Operations Administrator

Purpose:

Platform operations.

Permissions:

✅ Manage queue

✅ View robots

✅ View contracts

✅ View companies

✅ Resolve operational issues

✅ Manage maintenance workflow

Cannot:

❌ Modify financial calculations

❌ Change payroll

---

# Billing Administrator

Purpose:

Financial operations.

Permissions:

✅ View invoices

✅ Create adjustments

✅ Process refunds

✅ Review payroll

✅ Export reports

Cannot:

❌ Change heartbeat records

❌ Manage users

---

# Security Administrator

Purpose:

Platform security.

Permissions:

✅ Lock accounts

✅ Reset MFA

✅ Review audit logs

✅ Investigate suspicious activity

✅ Rotate internal credentials

✅ Review API security

Cannot:

❌ Modify financial records

❌ Change contracts

---

# Platform Administrator

Purpose:

General platform administration.

Permissions:

✅ Manage users

✅ Manage companies

✅ Manage manufacturers

✅ Suspend robots

✅ Review disputes

✅ Override contracts (with audit)

✅ Queue administration

✅ Reporting

Cannot:

❌ Delete audit logs

❌ Remove financial history

---

# Super Administrator

Highest permission level.

Reserved for Nation Reserve.

Permissions:

✅ Everything available to Platform Administrators

Plus:

✅ Platform configuration

✅ Feature flags

✅ Emergency shutdown procedures

✅ Permission management

✅ Internal service configuration

✅ Global API settings

✅ Disaster recovery tools

Even Super Administrators may not delete immutable audit logs, historical payroll records, verified heartbeat history, or ownership history. Corrections must occur through controlled adjustment workflows that preserve history.

---

# Permission Matrix

| Permission                   | Robot Owner      | Company Employee    | Company Manager | Company Admin | Manufacturer Admin | Platform Admin             | Super Admin |
| ---------------------------- | ---------------- | ------------------- | --------------- | ------------- | ------------------ | -------------------------- | ----------- |
| View own robots              | ✓                | —                   | —               | —             | —                  | ✓                          | ✓           |
| Register robots              | ✓ (owned robots) | —                   | —               | —             | ✓                  | ✓                          | ✓           |
| View heartbeats              | ✓ (owned robots) | ✓ (assigned robots) | ✓               | ✓             | ✓                  | ✓                          | ✓           |
| Create contracts             | —                | —                   | ✓               | ✓             | —                  | ✓                          | ✓           |
| Approve contracts            | —                | —                   | ✓               | ✓             | —                  | ✓                          | ✓           |
| View invoices                | ✓ (payroll)      | ✓                   | ✓               | ✓             | —                  | ✓                          | ✓           |
| Manage company users         | —                | —                   | —               | ✓             | —                  | ✓                          | ✓           |
| Rotate manufacturer API keys | —                | —                   | —               | —             | ✓                  | ✓                          | ✓           |
| Manage queue                 | —                | —                   | —               | —             | —                  | ✓                          | ✓           |
| Process billing adjustments  | —                | —                   | —               | —             | —                  | ✓ (Billing/Platform Admin) | ✓           |
| View audit logs              | Personal only    | —                   | Limited         | Limited       | Limited            | ✓                          | ✓           |

---

# Resource Ownership Rules

Users should only access resources they own or have been granted access to.

Examples:

- Robot Owners only access their own robots.
- Hiring Companies only access their own facilities, contracts, and invoices.
- Manufacturers only access their registered models and integrations.
- Administrators access resources according to their assigned platform role.

Ownership checks should be enforced in every API endpoint.

---

# Delegation

Organizations may delegate responsibilities without transferring ownership.

Examples:

- A Company Administrator can assign a Company Manager.
- A Manufacturer Administrator can assign a Manufacturer Engineer.
- A Robot Owner cannot delegate legal ownership through role assignment; ownership transfers require the dedicated transfer workflow.

---

# Temporary Access

The platform should support temporary elevated access for operational purposes.

Examples:

- Temporary support access during a customer issue.
- Time-limited engineering access for troubleshooting.
- Emergency administrative access.

Every temporary permission must:

- Have an expiration time.
- Record who granted it.
- Record why it was granted.
- Generate audit entries.

---

# Permission Changes

Every permission change should create an immutable audit record containing:

- User receiving the change.
- User granting the change.
- Previous role.
- New role.
- Timestamp.
- Reason (optional but recommended).

---

# Sensitive Operations

The following actions should require explicit confirmation and enhanced authorization where appropriate:

- Ownership transfers
- Queue modifications
- Payroll adjustments
- Billing adjustments
- API credential rotation
- Contract overrides
- Company verification changes
- Manufacturer approval or suspension
- Robot retirement
- User suspension

---

# Future Enterprise Roles

The authorization model should support future additions without redesign, such as:

- Regional Operations Manager
- Compliance Officer
- Auditor (read-only)
- Enterprise Billing Manager
- Enterprise API Administrator
- External Inspector
- Government Observer (read-only, if legally required)

---

# Acceptance Criteria

This appendix is complete when:

- Every platform and organization role is defined.
- Role responsibilities and restrictions are documented.
- Resource ownership rules are established.
- Permission delegation and temporary access are supported.
- Sensitive operations require explicit authorization and auditing.
- The authorization model is scalable for future enterprise growth.

---

### Recommendation Before Appendix H

As notifications become a core user experience feature, I recommend distinguishing between **mandatory system notifications** (such as security alerts, payroll completion, or heartbeat failures) that users cannot disable, and **optional preference-based notifications** (such as product updates or informational reminders). This distinction will keep the notification system predictable while allowing users to customize non-critical communications.
