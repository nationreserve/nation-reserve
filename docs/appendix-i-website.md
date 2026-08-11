# Nation Reserve Master Specification

# Volume I — Appendix I

# Website & Landing Page Specification

**Version:** 1.0
**Status:** Authoritative Public Website and Conversion Specification

---

# Purpose

This appendix defines the public-facing RoboWorkPool website operated by Nation Reserve.

The website must explain the product clearly to four audiences:

- Hiring Companies
- Robot Owners
- Robot Manufacturers
- General visitors, partners, and press

Its primary purpose is to convert qualified visitors into registered platform users while accurately explaining:

- The standardized **$5 per verified operating hour** model
- The **15% platform fee**
- The Heartbeat API
- Robot ownership
- Hiring Company workforce access
- Manufacturer integration
- The Downpayment Queue
- Platform trust, safety, and accountability

The website must not make unverified earnings promises, guaranteed availability claims, or misleading statements about robot performance.

---

# Public Website Goals

The website should enable a visitor to understand within the first few seconds:

1. What RoboWorkPool does
2. Who it serves
3. How the $5-per-hour model works
4. How operating time is verified
5. What action the visitor should take next

The site should prioritize clarity over technical complexity.

---

# Brand Structure

The public website should use the following hierarchy:

```text
Nation Reserve
└── RoboWorkPool
```

Nation Reserve is the platform company.

RoboWorkPool is the product.

The primary product name should consistently appear as:

**RoboWorkPool**

Avoid alternate spacing or capitalization such as:

- Robot Work Pool
- Robotworkpool
- Robo Workpool

These variations may be redirected for search or domain purposes but should not be used as the official product name.

---

# Core Public Messaging

## Primary Value Proposition

Recommended primary message:

> Hire or own productive robot labor through one standardized operating network.

Supporting message:

> RoboWorkPool connects robot owners, hiring companies, and manufacturers through verified operating time, standardized pay, and automatic platform records.

---

# Pricing Message

The website must clearly distinguish three financial concepts.

## Verified Robot Operating Rate

The Robot Owner earns:

**$5.00 per verified operating hour**

This applies only to time that qualifies under the Heartbeat API and platform operating rules.

---

## Platform Fee

The platform fee is:

**15%**

The exact fee base and customer-facing calculation must follow Appendix J.

The public website must not ambiguously imply that both parties pay the same fee unless Appendix J explicitly defines that structure.

---

## Hiring Company Cost

The website must display the Hiring Company's expected hourly charge using the final billing formula defined in Appendix J.

Until that formula is approved, the site copy should state:

> Hiring Company pricing is calculated from verified operating hours, the standardized robot labor rate, and applicable platform charges.

Do not publish a calculated company rate until the billing mathematics are finalized.

---

# Global Website Navigation

Desktop navigation should include:

- RoboWorkPool
- How It Works
- Hire Robots
- Own Robots
- Manufacturers
- Pricing
- Heartbeat API
- About
- Sign In
- Get Started

Mobile navigation should provide the same destinations through a collapsible menu.

Primary navigation should remain visible or easily accessible while scrolling.

---

# Primary Calls to Action

The website should use role-specific calls to action rather than one ambiguous registration button.

Primary CTA options:

- **Hire Robot Labor**
- **Become a Robot Owner**
- **Integrate as a Manufacturer**

Secondary CTA:

- **Sign In**

A general **Get Started** button may open a role-selection screen.

---

# Public Route Inventory

Recommended public routes:

```text
/
 /how-it-works
 /hire-robots
 /own-robots
 /manufacturers
 /heartbeat-api
 /pricing
 /downpayment-queue
 /safety-and-trust
 /faq
 /about
 /contact
 /support
 /status
 /legal/terms
 /legal/privacy
 /legal/cookies
 /legal/acceptable-use
 /legal/manufacturer-api-terms
 /login
 /register
 /register/robot-owner
 /register/hiring-company
 /register/manufacturer
```

The final route structure may use localized or framework-specific conventions, but the user-facing hierarchy should remain equivalent.

---

# Homepage Specification

## Homepage Objective

The homepage should explain the full marketplace without overwhelming the visitor.

It should direct each visitor into the correct journey.

---

# Homepage Section 1 — Hero

## Required Content

Headline:

> Productive robot labor through one verified network.

Supporting copy:

> RoboWorkPool connects robot owners, hiring companies, and manufacturers using standardized operating pay, verified robot connectivity, and automated records.

Primary buttons:

- Hire Robot Labor
- Become a Robot Owner

Secondary link:

- Manufacturer Integration

Recommended visual:

A clean operational illustration showing:

- A robot
- A Hiring Company
- A Robot Owner
- A manufacturer connection
- A verified heartbeat signal
- A payroll or billing record

The visual should emphasize coordinated infrastructure, not science-fiction combat imagery.

---

# Homepage Section 2 — How the Network Works

Display a simple four-step process.

## Step 1 — Robots Enter the Network

Approved manufacturers register supported robot models and individual serial numbers.

## Step 2 — Owners Activate Robots

Robot ownership is verified, and the robot is connected to the platform.

## Step 3 — Companies Request Capacity

Hiring Companies define facilities, operating needs, robot quantities, and expected work windows.

## Step 4 — Verified Operation Creates Records

The Heartbeat API confirms qualifying operating time, which supports billing and Robot Owner payroll.

CTA:

**See How It Works**

---

# Homepage Section 3 — Standardized $5 Operating Pay

Required heading:

> $5 per verified operating hour for Robot Owners

Required explanation:

- The rate is standardized across the platform.
- Robot Owners do not negotiate a separate hourly rate for every contract.
- Only verified qualifying operating time is payable.
- Scheduled time alone does not create earnings.
- The Heartbeat API is the authoritative operating-time source.

Required disclaimer:

> Actual earnings depend on robot availability, assignments, verified operation, maintenance, demand, taxes, fees, and other platform conditions. Earnings are not guaranteed.

Do not use phrases such as:

- Guaranteed passive income
- Risk-free income
- Guaranteed returns
- Earn money 24/7
- Automatic profit

---

# Homepage Section 4 — For Hiring Companies

Heading:

> Access robot labor without buying the robots upfront

Required benefits:

- Request robot capacity by facility or department
- Use a standardized pricing model
- Track assigned robot serial numbers
- Review operational status
- Monitor verified operating hours
- Receive consolidated invoices
- Report inactive or unavailable robots
- Plan future workforce needs

Primary CTA:

**Hire Robot Labor**

Secondary CTA:

**View Hiring Company Workflow**

Required clarification:

RoboWorkPool provides access to robot labor capacity. It does not promise that every requested quantity, location, schedule, or task can be fulfilled.

---

# Homepage Section 5 — For Robot Owners

Heading:

> Put eligible robots into a verified operating network

Required benefits:

- Manage up to 20 active robots
- View verified operating hours
- Track assignments
- Receive automated payroll records
- Monitor heartbeat status
- Request maintenance
- Review ownership history
- Join the Downpayment Queue when available

Primary CTA:

**Become a Robot Owner**

Secondary CTA:

**Learn About the Queue**

Required clarification:

Owning or reserving a robot does not guarantee assignment volume or earnings.

---

# Homepage Section 6 — For Manufacturers

Heading:

> Connect your fleet through a standardized API

Required benefits:

- Sandbox integration environment
- Production credentials after approval
- Robot model registration
- Serial-number registration
- Signed heartbeat requests
- Fleet health monitoring
- Firmware records
- Integration diagnostics

Primary CTA:

**Start Manufacturer Integration**

Secondary CTA:

**View Heartbeat API Overview**

---

# Homepage Section 7 — Heartbeat Verification

Heading:

> Verified operating time, without a separate tracking device

Required explanation:

Each approved manufacturer connects its robots to the RoboWorkPool Heartbeat API.

The platform uses authenticated heartbeat records to determine whether a robot is connected and producing qualifying operating time.

The website should clearly state:

- A dedicated external uptime device is not required by default.
- Manufacturer software sends the required operational heartbeat.
- Each robot is identified by a unique serial number.
- Heartbeat records support payroll and billing verification.
- Invalid, duplicate, delayed, or unauthorized messages are subject to validation.
- Heartbeats alone do not override safety suspensions, maintenance status, contract rules, or other eligibility conditions.

CTA:

**Explore the Heartbeat API**

---

# Homepage Section 8 — Trust and Accountability

Required topics:

- Unique robot serial identification
- Manufacturer approval
- Signed API requests
- Verified operating records
- Ownership history
- Contract records
- Financial audit trails
- Maintenance status
- Role-based permissions
- Administrative review

CTA:

**View Safety and Trust**

---

# Homepage Section 9 — Downpayment Queue

Heading:

> A transparent path toward robot access

Required explanation:

The Downpayment Queue is intended for eligible Robot Owners seeking future robot fulfillment or financing access through approved programs.

The website should explain that users can view:

- Their own queue position
- Their own payment status
- Estimated fulfillment range
- Movement history
- Required next actions

Required limitations:

- Queue position is not transferable unless specifically approved.
- Estimated dates are not guarantees.
- Other participants' personal information is not visible.
- Manual adjustments require authorization and audit records.
- Queue rules may vary by robot model, manufacturer, region, or fulfillment program.

CTA:

**Learn About the Queue**

---

# Homepage Section 10 — Platform Statistics

Public statistics may eventually include:

- Active robots
- Verified operating hours
- Participating manufacturers
- Hiring Company locations
- Platform uptime

Only validated, current, non-confidential statistics may be displayed.

Every statistic should include:

- Measurement definition
- Reporting period
- Last updated timestamp
- Whether it is exact or rounded

Do not display placeholder statistics in production.

---

# Homepage Section 11 — FAQ Preview

Display five to eight high-value questions, such as:

- What is a verified operating hour?
- How much does a Robot Owner earn?
- Does a Hiring Company have to purchase a robot?
- How does the Heartbeat API work?
- Can one owner manage multiple robots?
- What happens when a robot goes offline?
- How does the Downpayment Queue work?
- How do manufacturers join?

CTA:

**View All FAQs**

---

# Homepage Section 12 — Final Conversion

Heading:

> Choose how you want to participate

Display three role cards:

## Hiring Company

Request robot labor capacity.

Button:

**Hire Robots**

## Robot Owner

Register eligible robots or join an available fulfillment queue.

Button:

**Own Robots**

## Manufacturer

Connect supported robots through the integration program.

Button:

**Integrate Robots**

---

# Homepage Footer

Required footer sections:

## Product

- How It Works
- Hire Robots
- Own Robots
- Manufacturers
- Pricing
- Heartbeat API

## Company

- About Nation Reserve
- Contact
- Careers, when available
- Press, when available

## Resources

- FAQ
- Support
- Status
- Documentation
- Safety and Trust

## Legal

- Terms of Service
- Privacy Policy
- Cookie Policy
- Acceptable Use Policy
- Manufacturer API Terms

Footer should also display:

- Copyright
- Nation Reserve legal entity name
- Business contact information where legally required
- Social links only when actively maintained

---

# How It Works Page

## Purpose

Provide a complete but accessible explanation of the end-to-end platform.

## Required Flow

```text
Manufacturer Approval
↓
Robot Model Registration
↓
Individual Robot Registration
↓
Owner Verification
↓
Robot Activation
↓
Hiring Company Contract
↓
Robot Assignment
↓
Heartbeat Verification
↓
Billing and Payroll
↓
Maintenance, Reassignment, or Retirement
```

Each step should explain:

- Responsible party
- Required action
- Result
- Common failure conditions
- Next step

---

# Hire Robots Page

## Audience

Hiring Companies evaluating RoboWorkPool.

## Required Sections

### Hero

> Plan robot labor without making an upfront robot purchase.

CTA:

**Create a Hiring Company Account**

### Use Cases

Examples may include:

- Warehousing
- Retail support
- Manufacturing support
- Facility operations
- Material movement
- Repetitive commercial tasks

Any use case shown must be framed as subject to robot capability, manufacturer support, local law, safety review, and contract approval.

### Company Workflow

1. Register company
2. Complete business verification
3. Add facilities and departments
4. Define workforce plan
5. Create contract request
6. Receive assignments
7. Monitor serial-identified robots
8. Pay for verified operating records

### Operational Visibility

Show examples of:

- Robot serial
- Current state
- Heartbeat status
- Verified hours
- Assignment
- Report inactive button
- Maintenance notice

### Pricing

Display the final company billing formula only after Appendix J approval.

### CTA

**Start Hiring Company Registration**

---

# Own Robots Page

## Audience

Individuals or organizations interested in robot ownership.

## Required Sections

### Hero

> Own eligible robots and receive pay for verified operating time.

CTA:

**Create a Robot Owner Account**

### Ownership Model

Explain:

- Maximum of 20 active robots per owner under current platform rules
- Legal ownership verification
- Manufacturer and serial registration
- Heartbeat activation
- Assignment eligibility
- Payroll based on verified qualifying time
- Maintenance responsibilities
- Transfer and retirement procedures

### Earnings Explanation

Must state:

- Standard rate: $5 per verified operating hour
- No guarantee of utilization
- No payment for unverified time
- No payment during disqualifying maintenance or suspension periods
- Taxes and financial obligations may apply
- Final payout timing depends on settlement and payment-provider rules

### Queue Explanation

Link to the Downpayment Queue page.

### CTA

**Register as a Robot Owner**

---

# Manufacturers Page

## Audience

Robot manufacturers and approved integration partners.

## Required Sections

### Hero

> Connect your robot fleet to RoboWorkPool.

CTA:

**Apply as a Manufacturer**

### Integration Requirements

Explain:

- Business approval
- Technical contact
- Supported model submission
- Unique serial registration
- Sandbox testing
- Signed API requests
- Production approval
- Operational monitoring
- Credential security
- Incident response

### Integration Journey

```text
Application
↓
Approval
↓
Sandbox Credentials
↓
Model Registration
↓
Heartbeat Testing
↓
Security Validation
↓
Production Approval
↓
Fleet Registration
↓
Ongoing Monitoring
```

### Documentation Preview

Link to:

- Authentication
- Heartbeat payload
- Error codes
- Retry behavior
- Rate limits
- Sandbox testing
- Credential rotation

Do not expose production secrets or internal security architecture publicly.

---

# Heartbeat API Public Page

## Purpose

Explain the Heartbeat API to nontechnical and technical audiences without publishing sensitive controls.

## Required Sections

### What It Does

The API records authenticated robot connectivity and operational state.

### Why It Exists

It provides a consistent source for qualifying operating-time verification.

### What It Does Not Do

It does not automatically prove:

- Work quality
- Safety compliance
- Correct task completion
- Physical location unless location verification is separately enabled
- Contract eligibility by itself
- Payroll eligibility when another disqualifying state applies

### Core Public Concepts

- Unique robot serial
- Manufacturer identity
- Timestamp
- Sequence number
- Robot state
- Runtime
- Signed request
- Duplicate protection
- Clock-skew validation
- Retry safety

### Technical CTA

**View Manufacturer Documentation**

### Manufacturer CTA

**Apply for Sandbox Access**

---

# Pricing Page

## Purpose

Present pricing transparently without combining distinct charges.

## Required Sections

### Robot Owner Rate

> $5.00 per verified operating hour

Explain:

- What counts as verified time
- What does not count
- Payroll timing
- Adjustments and disputes
- Tax responsibility
- No utilization guarantee

### Platform Fee

> 15% platform fee

The page must identify:

- Who is charged
- The calculation base
- Whether the fee is included in the displayed Hiring Company price
- Whether taxes apply
- Whether payment-processing charges are separate
- How refunds and credits affect the fee

These details must match Appendix J exactly.

### Hiring Company Billing

Include a sample invoice only after the approved formula is finalized.

A future example could show:

```text
Verified operating hours
× applicable operating rate
+ platform charge
+ applicable taxes or approved fees
− credits
= total invoice
```

The website should not imply that an illustrative example is a contractual quote.

### Pricing FAQ

Include:

- Are scheduled hours billed?
- Are offline hours billed?
- What happens during maintenance?
- Are partial hours rounded?
- How are disputes handled?
- Can rates be negotiated?
- Are taxes included?

---

# Downpayment Queue Page

## Purpose

Explain the queue without presenting it as an investment or guaranteed purchase opportunity.

## Required Sections

### Eligibility

Explain who may participate.

### Downpayment

Explain:

- Amount
- Refundability
- Application toward purchase or fulfillment
- Payment deadlines
- Failure consequences
- Applicable terms

These fields must remain configurable because programs may differ.

### Position

Explain:

- How initial position is assigned
- What causes movement
- What may pause a position
- How administrative corrections work
- How fulfillment programs affect ordering

### Estimate

Explain that fulfillment dates are estimates and may change because of:

- Manufacturer capacity
- Robot model availability
- Financing
- Verification delays
- Regional eligibility
- Supply-chain changes
- Program suspension

### Privacy

A user sees only their own queue details.

### CTA

**Join the Queue**

The CTA should remain disabled or show **Join Waitlist** when no active fulfillment program is available.

---

# Safety and Trust Page

## Required Sections

### Identity and Organization Verification

Explain verification at a high level.

### Manufacturer Approval

Explain that production access is restricted to approved manufacturers.

### Robot Serial Registry

Each robot requires a unique serial identifier.

### Heartbeat Security

Explain signed requests, replay protection, and validation without exposing exploitable details.

### Financial Records

Explain immutable transaction history and controlled adjustments.

### Maintenance and Suspension

Explain that robots may be removed from payable service when unsafe, offline, under repair, or noncompliant.

### Reporting

Hiring Companies and authorized users can report inactive, damaged, unsafe, or unavailable robots.

### Auditability

Sensitive actions produce audit records.

### Responsible Disclosure

Provide a security reporting path.

---

# About Page

## Required Content

- Nation Reserve mission
- RoboWorkPool purpose
- Product principles
- Standardized access to robot labor
- Verifiable operational infrastructure
- Long-term vision
- Company legal identity

Avoid unsupported claims about being the first, largest, safest, or most advanced platform.

---

# Contact Page

Contact categories:

- Hiring Company Sales
- Robot Owner Support
- Manufacturer Partnerships
- Technical Integration
- Billing
- Security
- Press
- Legal

Required fields:

- Name
- Email
- Organization
- Contact category
- Subject
- Message
- Consent acknowledgment

Optional:

- Phone
- Relevant robot serial
- Contract ID
- Ticket reference

Sensitive financial or identity documents should not be submitted through a general contact form.

---

# FAQ Page

FAQ categories:

- General
- Robot Owners
- Hiring Companies
- Manufacturers
- Heartbeat Verification
- Contracts
- Billing
- Payroll
- Downpayment Queue
- Maintenance
- Security
- Account Management

FAQ answers must be version-controlled and reviewed when business rules change.

---

# Public Status Page

## Purpose

Communicate major service availability without exposing infrastructure details.

Potential components:

- Web application
- Client API
- Manufacturer API
- Heartbeat ingestion
- Authentication
- Billing
- Notifications
- Documentation

Status values:

- Operational
- Degraded Performance
- Partial Outage
- Major Outage
- Maintenance

The page should provide:

- Current status
- Incident summary
- Start time
- Updates
- Resolution time
- Historical incidents

---

# Registration Role Selection

Route:

```text
/register
```

Required heading:

> How will you use RoboWorkPool?

Role cards:

## Robot Owner

For users who own or plan to own eligible robots.

## Hiring Company

For businesses seeking robot labor.

## Manufacturer

For companies that manufacture or control supported robot systems.

Each role card should show:

- Summary
- Main requirements
- Expected setup time range, only if reliable
- Continue button

Users must not accidentally create the wrong organization type without a correction path.

---

# Robot Owner Registration Page

Required fields:

- Legal name
- Email
- Phone
- Password
- Country
- State or region
- Intended ownership type: individual or organization
- Terms acceptance
- Privacy acceptance
- Earnings disclaimer acknowledgment

Do not collect full bank, tax, or identity details on the initial public form unless necessary. These should generally be completed through secure authenticated onboarding.

---

# Hiring Company Registration Page

Required fields:

- Company legal name
- Business email
- Primary contact
- Country
- State or region
- Industry
- Estimated robot need
- Password
- Terms acceptance
- Privacy acceptance

Optional qualification fields:

- Number of facilities
- Intended deployment region
- Target implementation timeframe
- Primary use case

These qualification fields must not automatically approve a company.

---

# Manufacturer Registration Page

Required fields:

- Legal company name
- Company website
- Primary business contact
- Technical contact
- Security contact
- Country
- Supported robot categories
- Estimated fleet size
- API integration capability acknowledgment
- Terms acceptance
- Manufacturer API terms acknowledgment

Optional:

- Model documentation
- Certification references
- Integration notes

Applications should enter a pending review state.

---

# Login Page

Required functions:

- Email and password
- MFA challenge
- Remember device, subject to security policy
- Forgot password
- Resend verification
- Account recovery
- Support link

The login page should not reveal whether an unknown email belongs to a valid account beyond what is required for a usable experience.

---

# Public Website Personalization

Role-based personalization may be used after the visitor explicitly selects a role.

Examples:

- Hiring Company visitors see company-relevant CTAs.
- Manufacturer visitors see API documentation links.
- Robot Owner visitors see queue and ownership information.

Personalization must not create contradictory pricing or policy information.

---

# Website Search

A public search feature may index:

- FAQ
- Help documentation
- Public API documentation
- Legal pages
- Public product pages

It must not expose:

- User profiles
- Robot records
- Company records
- Queue positions
- Contracts
- Invoices
- Heartbeat records
- Internal documents

---

# Content Management Requirements

Marketing and help content should be manageable through a controlled content system.

Editable content may include:

- Homepage copy
- FAQ
- Pricing explanations
- Legal notices
- Product announcements
- Documentation links
- Status notices

Every production content change should record:

- Author
- Reviewer where required
- Timestamp
- Previous version
- New version
- Publication status

Financial, legal, security, and API claims should require appropriate approval before publication.

---

# SEO Requirements

Public pages should support:

- Unique page titles
- Unique meta descriptions
- Canonical URLs
- Structured headings
- Open Graph metadata
- Social preview images
- XML sitemap
- Robots directives
- Accessible link text
- Server-rendered or prerendered public content where appropriate

Private portal routes must not be indexed.

---

# Accessibility Requirements

The public website should target WCAG 2.2 AA principles.

Requirements include:

- Keyboard navigation
- Visible focus states
- Semantic headings
- Form labels
- Error descriptions
- Sufficient contrast
- Alternative text
- Reduced-motion support
- Accessible modal behavior
- Screen-reader announcements
- Captions or transcripts for video content
- No essential information conveyed by color alone

---

# Responsive Design

Required breakpoints should support:

- Mobile
- Tablet
- Laptop
- Large desktop

Core calls to action and pricing disclosures must remain visible and understandable on small screens.

Tables should convert to cards, scrolling regions, or simplified layouts when necessary.

---

# Performance Requirements

Public website targets:

- Fast initial rendering
- Optimized images
- Lazy-loaded noncritical media
- Minimal blocking scripts
- Cached public content
- Stable layout
- Graceful degradation
- No dependency on authenticated platform services for basic marketing content

Marketing pages should remain available during partial portal outages whenever reasonably possible.

---

# Analytics Requirements

The website may track:

- Page views
- CTA clicks
- Registration starts
- Registration completions
- Role selections
- Documentation views
- Form errors
- Conversion funnels

Analytics must not capture:

- Passwords
- API secrets
- Government ID data
- Full bank information
- Tax identifiers
- Sensitive form content
- Private authenticated data without authorization

Consent and cookie controls must follow applicable legal requirements.

---

# Conversion Events

Recommended public conversion events:

```text
public.cta.hire_robots.clicked
public.cta.become_owner.clicked
public.cta.manufacturer.clicked
public.registration.role_selected
public.registration.started
public.registration.completed
public.contact.submitted
public.documentation.opened
public.queue.interest.started
```

These events should connect to Appendix F without exposing personal data unnecessarily.

---

# Form Validation Standards

All public forms should provide:

- Inline validation
- Plain-language errors
- Server-side validation
- Duplicate-submission protection
- Rate limiting
- Bot protection
- Accessible error summaries
- Preservation of safe non-sensitive inputs after validation failure

Do not rely on client-side validation alone.

---

# Public Error Pages

Required error states:

- 400 — Invalid Request
- 401 — Authentication Required
- 403 — Access Denied
- 404 — Page Not Found
- 429 — Too Many Requests
- 500 — Unexpected Error
- 503 — Temporarily Unavailable

Each page should provide:

- Clear explanation
- Safe next action
- Home link
- Support or status link where appropriate
- Request ID for reportable system errors

Do not expose stack traces or infrastructure information.

---

# Legal and Compliance Disclosures

The website must clearly provide:

- Terms of Service
- Privacy Policy
- Cookie Policy
- Acceptable Use Policy
- Manufacturer API Terms
- Financial and earnings disclaimers
- Queue terms
- Billing disclosures
- Contact details for legal notices

The platform should not describe Robot Owner participation as an investment unless future legal review explicitly approves that classification and terminology.

---

# Prohibited Marketing Claims

The public website must not state or imply:

- Guaranteed Robot Owner income
- Guaranteed robot utilization
- Guaranteed queue fulfillment date
- Guaranteed Hiring Company capacity
- Guaranteed performance of any robot
- Risk-free ownership
- Legally approved operation in every jurisdiction
- Universal robot compatibility
- Human-equivalent capability unless specifically substantiated
- Payroll based solely on schedules
- That heartbeat connectivity proves work quality or task completion
- That the platform owns every listed robot
- That manufacturers are approved before verification is complete

---

# Administrative Website Controls

Authorized content administrators should be able to:

- Draft content
- Preview changes
- Request approval
- Schedule publication
- Roll back content
- Manage FAQs
- Manage public notices
- Update documentation links
- Publish outage banners
- Disable inaccurate CTAs
- Review conversion analytics

Publishing rights should be separated from drafting rights for sensitive content.

---

# Website Integration With the Platform

The website and authenticated platform may share:

- Brand system
- Authentication entry points
- Account registration
- Help content
- Status information
- Legal documents

They should remain logically separated so that:

- Marketing pages can be cached.
- Authenticated data is never included in public HTML.
- A portal deployment does not unnecessarily take down the public website.
- Public forms use secured APIs.
- Authentication cookies or tokens are scoped correctly.

---

# Acceptance Criteria

This appendix is complete when:

- Every major public website route is defined.
- Homepage sections and calls to action are specified.
- Messaging for the $5 verified operating rate and 15% platform fee is accurate and clearly separated.
- Hiring Company, Robot Owner, and Manufacturer conversion journeys are complete.
- The Heartbeat API is explained without exposing sensitive security details.
- The Downpayment Queue is presented without guarantees or investment-style claims.
- Legal, accessibility, security, SEO, analytics, and performance requirements are established.
- Public claims are constrained by the immutable business rules.
- Registration paths connect correctly to the authenticated onboarding journeys.
- Website content can be implemented without additional product-design assumptions.

---

# Next Appendix

# Appendix J — Billing & Financial Mathematics

This appendix will define the exact financial formulas for:

- Hiring Company charges
- Robot Owner earnings
- The 15% platform fee
- Verified time calculations
- Rounding
- Partial hours
- Invoice lines
- Payroll
- Taxes
- Refunds
- Credits
- Adjustments
- Failed payments
- Worked examples
