import { Children, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  Button,
  FeeBreakdown,
  FinancialTermDefinition,
  PageHeader,
  ServiceIntroduction,
  StatusBadge,
} from "@nation-reserve/design-system";
import { PublicShell } from "@nation-reserve/application-shell";
import { api } from "./auth-client.js";
import { Homepage } from "./Homepage.js";

type PublicPageProps = { path: string };
type Meta = {
  title: string;
  description: string;
  canonical: string;
  schema?: Record<string, unknown>;
};
const site = globalThis.location?.origin ?? "https://nationreserve.example";
function usePageMeta(meta: Meta) {
  useEffect(() => {
    document.title = `${meta.title} | Nation Reserve`;
    let description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }
    description.content = meta.description;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `${site}${meta.canonical}`;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.append(robots);
    }
    robots.content = "index,follow";
    const id = "nr-public-structured-data";
    document.getElementById(id)?.remove();
    if (meta.schema) {
      const script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      script.text = JSON.stringify(meta.schema);
      document.head.append(script);
    }
    return () => document.getElementById(id)?.remove();
  }, [meta]);
}
function track(name: string, detail: Record<string, string> = {}) {
  dispatchEvent(new CustomEvent("nr:analytics", { detail: { name, ...detail } }));
}
const LinkButton = ({
  href,
  children,
  secondary = false,
  event,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  event?: string;
}) => (
  <a
    className={`nr-button nr-button--${secondary ? "secondary" : "primary"}`}
    href={href}
    onClick={() => event && track(event)}
  >
    {children}
  </a>
);
function Orientation({ children }: { children: ReactNode }) {
  return (
    <aside className="public-orientation">
      <strong>What this page is about</strong>
      <p>{children}</p>
    </aside>
  );
}
function Section({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="public-section" id={id}>
      {eyebrow && <p className="nr-eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Cards({ children }: { children: ReactNode }) {
  const count = Children.count(children);
  return (
    <div className={`public-card-grid public-card-grid--${count}`}>{children}</div>
  );
}
function InfoCard({
  title,
  children,
  href,
  label,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  label?: string;
}) {
  return (
    <article className="public-card">
      <h3>{title}</h3>
      <div>{children}</div>
      {href && (
        <a href={href}>
          {label ?? "Learn more"} <span aria-hidden="true">→</span>
        </a>
      )}
    </article>
  );
}
function Steps({ items }: { items: Array<{ title: string; text: string }> }) {
  return (
    <ol className="public-steps">
      {items.map((item, index) => (
        <li key={item.title}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
function Page({
  meta,
  title,
  intro,
  children,
  actions,
}: {
  meta: Meta;
  title: string;
  intro: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  usePageMeta(meta);
  return (
    <PublicShell>
      <article className="public-page">
        <PageHeader
          eyebrow="Nation Reserve · RoboWorkPool"
          title={title}
          description={intro}
          actions={actions}
        />
        <Orientation>{intro}</Orientation>
        {children}
      </article>
    </PublicShell>
  );
}
const disclaimers = (
  <Alert tone="warning" title="Important participation information">
    Robot availability, assignments, utilization, earnings, fulfillment dates, and task
    capability are not guaranteed. Eligibility, verified operation, safety, maintenance,
    demand, fees, taxes, and applicable law affect outcomes.
  </Alert>
);

function Home() {
  return <Homepage />;
}
function Overview() {
  return (
    <Page
      meta={{
        title: "RoboWorkPool overview",
        description:
          "Understand who RoboWorkPool serves, how robots are assigned, and how verified operation supports records.",
        canonical: "/roboworkpool",
      }}
      title="Robot workforce operations with evidence built in"
      intro="This page explains what RoboWorkPool is, who participates, how manufacturer fulfillment works, and why verified operating time matters."
      actions={<LinkButton href="/register">Get started</LinkButton>}
    >
      <ServiceIntroduction />
      <Section title="Designed around accountable participation">
        <Cards>
          <InfoCard title="Demand">
            <p>
              Hiring Companies define approved operational requirements—not anonymous
              marketplace bids.
            </p>
          </InfoCard>
          <InfoCard title="Fulfillment">
            <p>
              Approved Robot Manufacturers confirm capability and allocate compatible
              eligible robots.
            </p>
          </InfoCard>
          <InfoCard title="Evidence">
            <p>
              Signed heartbeat records and assignment context support verified operating
              time.
            </p>
          </InfoCard>
          <InfoCard title="Records">
            <p>
              Operational and financial states stay precise, reviewable, and
              organization-scoped.
            </p>
          </InfoCard>
        </Cards>
      </Section>
      <Section title="Start with the path that matches you">
        <div className="public-actions">
          <LinkButton href="/roboworkpool/hiring-companies">Hiring Company</LinkButton>
          <LinkButton href="/roboworkpool/robot-owners" secondary>
            Robot Owner
          </LinkButton>
          <LinkButton href="/roboworkpool/manufacturers" secondary>
            Robot Manufacturer
          </LinkButton>
        </div>
      </Section>
      {disclaimers}
    </Page>
  );
}

function HowItWorks() {
  return (
    <Page
      meta={{
        title: "How RoboWorkPool works",
        description:
          "Follow company demand through ownership, manufacturer fulfillment, serial-linked assignment, verified operation, billing, and earnings.",
        canonical: "/roboworkpool/how-it-works",
      }}
      title="How RoboWorkPool turns demand into verified robot work"
      intro="The lifecycle connects company workforce demand, eligible robot ownership, manufacturer fulfillment, serial-identified assignments, heartbeat evidence, and controlled financial records."
    >
      <Section title="From workforce need to verified operation">
        <Steps
          items={[
            {
              title: "Company defines workforce demand",
              text: "The Hiring Company documents approved work, location, quantity, schedules, and operating requirements.",
            },
            {
              title: "Ownership and supply are connected",
              text: "RoboWorkPool links eligible ownership capacity with an approved manufacturer able to fulfill the demand.",
            },
            {
              title: "Manufacturer fulfills the robot",
              text: "The manufacturer confirms compatibility, fulfills the approved order, and assigns a unique serial identifier.",
            },
            {
              title: "Contract assignment is activated",
              text: "The robot serial, contract, schedule, company, manufacturer, and ownership records remain linked.",
            },
            {
              title: "The robot performs company work",
              text: "Only operation within an eligible assignment context can proceed toward financial verification.",
            },
            {
              title: "Heartbeat evidence supports verification",
              text: "Authenticated manufacturer integration submits operating evidence with duplicate and replay controls.",
            },
            {
              title: "Records support billing and earnings",
              text: "Finalized verified time supports company invoices and applicable owner earnings without collapsing accrued, settled, payout-ready, and paid states.",
            },
          ]}
        />
      </Section>
      <Section title="Operational exceptions remain visible">
        <Cards>
          <InfoCard title="Offline or inactive">
            <p>
              Authorized review distinguishes connectivity loss from scheduled downtime
              and other states.
            </p>
          </InfoCard>
          <InfoCard title="Maintenance">
            <p>
              Maintenance cases retain robot, assignment, responsibility, evidence, and
              resolution history.
            </p>
          </InfoCard>
          <InfoCard title="Replacement">
            <p>
              Controlled replacement preserves the original serial record while linking
              the approved successor.
            </p>
          </InfoCard>
        </Cards>
      </Section>
      <div className="public-actions">
        <LinkButton href="/roboworkpool/hiring-companies">
          Automate my company
        </LinkButton>
        <LinkButton href="/roboworkpool/robot-owners" secondary>
          Explore ownership
        </LinkButton>
        <LinkButton href="/roboworkpool/manufacturers" secondary>
          Explore manufacturing
        </LinkButton>
      </div>
      {disclaimers}
    </Page>
  );
}
function PersonaPage({ kind }: { kind: "owner" | "company" | "manufacturer" }) {
  const config = {
    owner: {
      title: "Own eligible robots in a verified operating network",
      intro:
        "Create and verify an owner account, connect funding and payout methods, join an eligible Downpayment Queue, receive whole or fractional ownership allocations, and follow serial-linked verified operation without guaranteed returns.",
      audience: "Robot Owners",
      cta: "Create a Robot Owner account",
      href: "/register/robot-owner",
      sections: [
        "Create the Robot Owner account or organization and complete applicable verification.",
        "Connect required funding methods and the separate payout bank destination through the configured processor.",
        "Place an eligible contribution when a public Downpayment Queue program is active.",
        "Track your private queue position, amount, timestamp, status, history, next action, and purchase-order status.",
        "Approved demand and manufacturer fulfillment select the earliest eligible positions for whole or fractional ownership allocation.",
        "A manufacturer serial identifier, tested Heartbeat API connection, and eligible contract assignment activate the fulfilled robot.",
        "Review verified payable operating time and applicable gross owner earnings; a schedule alone creates no earnings.",
        "Review platform fees, holds or adjustments, net amount, payout eligibility, processor state, and completed payout.",
        "Track inactivity, maintenance, replacement implications, permitted transfers, retirement, and permanent history.",
      ],
    },
    company: {
      title: "Plan robot labor without buying robots upfront",
      intro:
        "Create verified company operations, define normal concurrent robot requirements, contract with approved manufacturers, monitor serial-identified robots and verified payable time, pay invoices, and coordinate training demonstrations when applicable.",
      audience: "Hiring Companies",
      cta: "Create a Hiring Company account",
      href: "/register/hiring-company",
      sections: [
        "Create the Hiring Company organization, invite authorized users, and complete required verification.",
        "Create facilities and departments; define work, capabilities, normal concurrent robot need, and anticipated schedules.",
        "Submit capability, quantity, facility, schedule, operational, and applicable training-demonstration requirements. Orders cannot exceed approved normal concurrent need.",
        "An eligible approved Robot Manufacturer accepts or confirms fulfillment through the governed matching workflow.",
        "Associate each physical robot serial identifier and verify its software-based Heartbeat API connection before activation.",
        "Schedule work and monitor assignments, serial IDs, heartbeat status, operational status, and verified operating time. Scheduling is not proof of payable operation.",
        "Report the exact inactive, damaged, unsafe, unavailable, or repairing serial and follow replacement or repair history.",
        "Review verified time, invoices, payments, disputes, contract versions, and reports.",
        "Coordinate manufacturer-requested training demonstrations and approved third-party capture equipment when applicable; this creates no separate worker payout role.",
      ],
    },
    manufacturer: {
      title: "Supply connected robots to the RoboWorkPool network",
      intro:
        "Create and verify a Robot Manufacturer, register models and unique serial identifiers, test the software-based Heartbeat API before activation, fulfill approved purchase orders, support robot lifecycles, and receive applicable settlement.",
      audience: "Robot Manufacturers",
      cta: "Create Manufacturer Account",
      href: "/register/manufacturer",
      sections: [
        "Create the Manufacturer organization, add authorized team members, and complete business verification.",
        "Define robot models, capabilities, specifications, availability, and eligible production capacity.",
        "Review eligible Hiring Company requirements and accept, decline, or confirm fulfillment as authorized.",
        "Receive the applicable purchase order after demand, capacity, and ownership funding rules are satisfied.",
        "Register every physical robot with a unique manufacturer serial identifier.",
        "Integrate the robot controller or approved gateway with the authenticated RoboWorkPool Heartbeat API.",
        "Send test messages and confirm connection, timestamps, sequences, idempotency, offline recovery, and dashboard visibility before shipment or activation.",
        "Fulfill, ship, deploy, activate, and associate serial-identified robots to the applicable contract.",
        "Monitor fleet, maintenance, repair, replacement, payment, payout-account, and settlement history; coordinate training-demonstration needs with the Hiring Company when applicable.",
      ],
    },
  }[kind];
  const path =
    kind === "owner"
      ? "/roboworkpool/robot-owners"
      : kind === "company"
        ? "/roboworkpool/hiring-companies"
        : "/roboworkpool/manufacturers";
  return (
    <Page
      meta={{ title: config.title, description: config.intro, canonical: path }}
      title={config.title}
      intro={config.intro}
      actions={<LinkButton href={config.href}>{config.cta}</LinkButton>}
    >
      <Section title={`${config.audience}: the complete path`}>
        <Steps
          items={config.sections.map((text, index) => ({
            title: `Step ${index + 1}`,
            text,
          }))}
        />
      </Section>
      {kind === "owner" && (
        <>
          <Section title="Earnings depend on verified operation">
            <FeeBreakdown />
            <p>
              The current maximum is 20 active Robot Equivalents per owner. No
              assignment volume, utilization, or earnings are guaranteed. Payment timing
              depends on financial finalization, eligibility, company settlement, and
              provider confirmation.
            </p>
          </Section>
          <Section title="Downpayment Queue">
            <p>
              One qualifying downpayment creates one auditable position under an active
              program. Selection converts the position into a purchase order; estimated
              timing is not guaranteed.
            </p>
            <LinkButton href="/roboworkpool/downpayment-queue" secondary>
              Review queue rules
            </LinkButton>
          </Section>
        </>
      )}
      {kind === "company" && (
        <>
          <Section title="Training-demonstration coordination">
            <p>
              A Robot Manufacturer may request human demonstrations for a capability.
              The Hiring Company coordinates requirements and approved third-party
              glasses, wristbands, or other capture equipment. RoboWorkPool does not
              create a training-worker role, wage, payroll, or payout.
            </p>
          </Section>
          <Section title="Operational visibility">
            <Cards>
              <InfoCard title="Serial accountability">
                <p>Locate each assigned robot through a friendly serial identity.</p>
              </InfoCard>
              <InfoCard title="Verified hours">
                <p>
                  Compare scheduled windows with heartbeat-supported qualifying
                  operation.
                </p>
              </InfoCard>
              <InfoCard title="Recovery">
                <p>
                  Report inactivity and follow maintenance or manufacturer replacement
                  without rewriting history.
                </p>
              </InfoCard>
              <InfoCard title="Billing">
                <p>
                  Invoiced, submitted, processing, settled, and paid remain separate
                  states.
                </p>
              </InfoCard>
            </Cards>
          </Section>
        </>
      )}
      {kind === "manufacturer" && (
        <Section title="Public integration concepts">
          <Cards>
            {[
              "Authentication and credential rotation",
              "Heartbeat payload and validation",
              "Idempotent retries and error codes",
              "Fleet-scaled rate limits",
              "Sandbox test evidence",
              "Production incident response",
            ].map((x) => (
              <InfoCard key={x} title={x}>
                <p>
                  Detailed approved documentation becomes available within the
                  manufacturer integration journey.
                </p>
              </InfoCard>
            ))}
          </Cards>
          <Alert title="Security boundary">
            This public overview does not expose production secrets, internal
            thresholds, or exploitable infrastructure details.
          </Alert>
        </Section>
      )}
      {kind === "owner" && (
        <Section title="Owner next steps">
          <div className="public-actions">
            <LinkButton href="/register/robot-owner">
              Create a Robot Owner Account
            </LinkButton>
            <LinkButton href="/roboworkpool/downpayment-queue" secondary>
              Join Downpayment Queue
            </LinkButton>
            <LinkButton href="/roboworkpool/robot-owners" secondary>
              Explore Robot Ownership
            </LinkButton>
            <LinkButton href="/roboworkpool/pricing" secondary>
              See How Earnings Work
            </LinkButton>
          </div>
        </Section>
      )}
      {kind === "company" && (
        <Section title="Company next steps">
          <div className="public-actions">
            <LinkButton href="/register/hiring-company">
              Create a Company Account
            </LinkButton>
            <LinkButton href="/company/contracts/new" secondary>
              Plan a Robot Contract
            </LinkButton>
            <LinkButton href="/roboworkpool/hiring-companies" secondary>
              See the Company Workflow
            </LinkButton>
          </div>
        </Section>
      )}
      {kind === "manufacturer" && (
        <Section title="Manufacturer next steps">
          <div className="public-actions">
            <LinkButton href="/register/manufacturer">
              Create Manufacturer Account
            </LinkButton>
            <LinkButton href="/manufacturer/heartbeat-integration" secondary>
              View Integration Process
            </LinkButton>
            <LinkButton href="/roboworkpool/manufacturers" secondary>
              View Manufacturer Workflow
            </LinkButton>
          </div>
        </Section>
      )}
      {disclaimers}
    </Page>
  );
}

function Pricing() {
  return (
    <Page
      meta={{
        title: "RoboWorkPool pricing",
        description:
          "See how verified operating time, the current $5 base, and separate 15% platform fees affect company charges and owner earnings.",
        canonical: "/roboworkpool/pricing",
        schema: {
          "@context": "https://schema.org",
          "@type": "Service",
          name: "RoboWorkPool verified robot operation",
        },
      }}
      title="Pricing tied to verified operating time"
      intro="This page separates the Robot Owner gross base, owner fee, Hiring Company base charge, company fee, and Nation Reserve revenue. It also explains what is not billed."
      actions={<LinkButton href="/register">Create an account</LinkButton>}
    >
      <Section title="Current configured example">
        <FeeBreakdown />
        <p>
          At the current configuration, the Hiring Company base is $5.00 plus a $0.75
          company platform fee, while the Robot Owner gross is $5.00 less a $0.75 owner
          platform fee. Combined platform revenue is $1.50 per verified hour. Values are
          prorated from verified seconds using the active versioned configuration.
        </p>
      </Section>
      <Section title="Financial language matters">
        <Cards>
          {(
            [
              "scheduled",
              "verified",
              "accrued",
              "invoiced",
              "settled",
              "financiallyReady",
              "readyForPayout",
              "paid",
            ] as const
          ).map((term) => (
            <InfoCard
              key={term}
              title={
                {
                  scheduled: "Scheduled",
                  verified: "Verified",
                  accrued: "Accrued",
                  invoiced: "Invoiced",
                  settled: "Settled",
                  financiallyReady: "Financially Ready",
                  readyForPayout: "Ready for Payout",
                  paid: "Paid",
                }[term]
              }
            >
              <FinancialTermDefinition term={term} />
            </InfoCard>
          ))}
        </Cards>
      </Section>
      <Section title="What can change an invoice or payout">
        <ul>
          <li>Verified duration and eligibility windows</li>
          <li>Approved credits, refunds, disputes, or adjustments</li>
          <li>Maintenance, suspension, invalid evidence, or financial holds</li>
          <li>Applicable taxes and approved charges</li>
          <li>Payment-provider settlement and payout conditions</li>
        </ul>
        <p>
          Illustrations are educational examples, not contractual quotes. Authoritative
          arithmetic is performed by backend financial services using integer minor
          units.
        </p>
      </Section>
      {disclaimers}
    </Page>
  );
}
function Trust() {
  return (
    <Page
      meta={{
        title: "Trust and verification",
        description:
          "Learn how identity, serials, signed heartbeat evidence, audit history, permissions, maintenance, and recovery support RoboWorkPool.",
        canonical: "/roboworkpool/trust-and-verification",
      }}
      title="Verification without pretending evidence proves everything"
      intro="This page explains the controls that support accountable robot operation, what heartbeat evidence can establish, and what still requires safety, contract, manufacturer, or administrative review."
    >
      <Section title="Layered accountability">
        <Cards>
          {[
            [
              "Identity and organizations",
              "Membership and permissions limit data and actions to the active organization context.",
            ],
            [
              "Manufacturer approval",
              "Sandbox and production access are separate; production requires approval.",
            ],
            [
              "Robot serial registry",
              "Each robot retains unique manufacturer-scoped identity and lifecycle history.",
            ],
            [
              "Heartbeat security",
              "Signed requests, timestamps, sequences, replay controls, and duplicate handling protect evidence.",
            ],
            [
              "Financial records",
              "Immutable ledger history and controlled adjustments preserve accounting evidence.",
            ],
            [
              "Maintenance and suspension",
              "Unsafe, offline, repaired, suspended, or ineligible robots can be removed from payable operation.",
            ],
            [
              "Reporting and replacement",
              "Authorized users report issues; replacements preserve prior assignment history.",
            ],
            [
              "Auditability",
              "Sensitive actions record the actor, resource, time, and reason.",
            ],
          ].map(([title, text]) => (
            <InfoCard key={title} title={title!}>
              <p>{text}</p>
            </InfoCard>
          ))}
        </Cards>
      </Section>
      <Section title="What a heartbeat does not prove">
        <ul>
          <li>Work quality or correct task completion</li>
          <li>Safety compliance or legal authorization</li>
          <li>Physical location unless a separate approved control applies</li>
          <li>
            Contract or payroll eligibility when another disqualifying state exists
          </li>
        </ul>
      </Section>
      <Alert tone="info" title="Responsible disclosure">
        A production security-reporting channel is awaiting publication approval. Do not
        include secrets or personal data in the general contact form.
      </Alert>
    </Page>
  );
}
function Heartbeat() {
  return (
    <Page
      meta={{
        title: "Heartbeat API overview",
        description:
          "Understand how approved manufacturers submit authenticated robot operating evidence without a separate tracking device.",
        canonical: "/roboworkpool/heartbeat-api",
      }}
      title="Heartbeat evidence for verified robot operation"
      intro="This page explains the Heartbeat API for technical and nontechnical readers without publishing sensitive security controls."
    >
      <Section title="What it does">
        <p>
          Approved Robot Manufacturers submit authenticated robot connectivity and
          operating-state messages. Valid evidence, together with eligible assignment
          and operating context, may support verified operating time.
        </p>
      </Section>
      <Section title="Core public concepts">
        <Cards>
          {[
            "Unique robot serial",
            "Manufacturer identity",
            "UTC timestamp",
            "Monotonic sequence",
            "Robot state and runtime",
            "Signed request",
            "Duplicate protection",
            "Clock-skew validation",
            "Idempotent retry",
          ].map((x) => (
            <InfoCard key={x} title={x}>
              <p>Validated as part of the approved integration contract.</p>
            </InfoCard>
          ))}
        </Cards>
      </Section>
      <Section title="What it does not do">
        <p>
          Heartbeat connectivity alone does not establish work quality, safety
          compliance, task completion, location, contract eligibility, or payroll
          eligibility when another rule disqualifies the interval.
        </p>
      </Section>
      <div className="public-actions">
        <LinkButton href="/roboworkpool/manufacturers">
          View manufacturer integration
        </LinkButton>
        <LinkButton href="/register/manufacturer" secondary>
          Apply for sandbox access
        </LinkButton>
      </div>
    </Page>
  );
}
function Queue() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    void api
      .get<{ enrollmentEnabled: boolean }>("/api/v1/public/downpayment-program")
      .then((x) => setEnabled(x.enrollmentEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return (
    <Page
      meta={{
        title: "Downpayment Queue",
        description:
          "Understand chronological queue ordering, privacy, contract demand, manufacturer fulfillment, purchase-order conversion, and permanent ownership traceability.",
        canonical: "/roboworkpool/downpayment-queue",
      }}
      title="A chronological, auditable fulfillment queue"
      intro="The Downpayment Queue is a fulfillment business rule, not an investment, transferable security, or guaranteed robot purchase opportunity."
    >
      <Section title="How queue order and fulfillment work">
        <Steps
          items={[
            {
              title: "Qualifying downpayment received",
              text: "Each qualifying downpayment creates one independently timestamped queue position.",
            },
            {
              title: "Position established",
              text: "You can see your own position and status; other participants personal information remains private.",
            },
            {
              title: "Chronological order preserved",
              text: "Ordering follows qualification timestamps. Authorized corrections require permanent audit history.",
            },
            {
              title: "Eligible contract demand exists",
              text: "An approved Hiring Company contract must require applicable robot capacity.",
            },
            {
              title: "Manufacturer fulfillment confirmed",
              text: "An eligible Robot Manufacturer confirms the required model, capability, and quantity.",
            },
            {
              title: "Purchase quantity authorized",
              text: "The platform rejects robot ordering above the contract approved normal concurrent requirement.",
            },
            {
              title: "Earliest eligible positions selected",
              text: "Qualifying positions are selected in chronological eligibility order.",
            },
            {
              title: "Purchase order and ownership",
              text: "Selected funding links to the purchase order and applicable whole or fractional ownership allocation.",
            },
            {
              title: "Permanent traceability",
              text: "Queue position, purchase order, manufacturer fulfillment, robot serial identifier, ownership allocation, and contract assignment remain linked.",
            },
          ]}
        />
      </Section>
      <Section title="What an enrolled owner can track">
        <ul>
          <li>Current queue number, shown prominently</li>
          <li>Contribution amount, timestamp, program, and status</li>
          <li>Movement and correction history</li>
          <li>Next required action and purchase-order status</li>
          <li>An anonymized queue view without other participant identities</li>
        </ul>
      </Section>
      <Section title="What may affect estimates">
        <ul>
          <li>Manufacturer capacity and model availability</li>
          <li>Verification, payment, and supply-chain delays</li>
          <li>Regional eligibility and contract demand</li>
          <li>Program suspension, documented withdrawal, or invalid participation</li>
        </ul>
      </Section>
      {enabled ? (
        <>
          <Alert tone="info" title="Enrollment is enabled">
            Review payment-method eligibility and program terms before submitting a
            qualifying contribution.
          </Alert>
          <LinkButton href="/account/payments-banking">
            Join Downpayment Queue
          </LinkButton>
        </>
      ) : (
        <>
          <Alert tone="warning" title="Public enrollment is currently unavailable">
            Enrollment is controlled by deployment configuration. No downpayment action
            is offered while the program is disabled.
          </Alert>
          <Button disabled title="No active fulfillment program">
            Join Downpayment Queue - unavailable
          </Button>
        </>
      )}
    </Page>
  );
}

const faqs = [
  [
    "General",
    "What is RoboWorkPool?",
    "A Nation Reserve product connecting Hiring Companies, Robot Owners, and approved Robot Manufacturers through controlled contracts, assignments, verified operating evidence, and financial records.",
  ],
  [
    "Robot Owners",
    "How can Robot Owners earn?",
    "Eligible whole or fractional ownership can receive its applicable share after assigned robot capacity performs verified paid work and financial and payout requirements are met.",
  ],
  [
    "Robot Owners",
    "Are Robot Owner earnings guaranteed?",
    "No. Demand, assignments, utilization, verified operation, company payment, maintenance, fees, taxes, holds, ownership share, and payout conditions affect outcomes.",
  ],
  [
    "Hiring Companies",
    "Does a Hiring Company have to purchase the robots?",
    "Not in the normal RoboWorkPool model. Approved ownership capacity and manufacturer fulfillment can support the fleet behind contracted robot labor.",
  ],
  [
    "Hiring Companies",
    "How does RoboWorkPool reduce upfront automation cost?",
    "It connects approved company demand with manufacturer fulfillment and independently owned robot capacity, reducing the need for the company to purchase an entire fleet upfront. It does not promise that every upfront cost is removed.",
  ],
  [
    "Manufacturers",
    "How do Robot Manufacturers sell robots through RoboWorkPool?",
    "Approved manufacturers register supported models, match compatible workforce demand, fulfill approved orders, assign serial identifiers, integrate heartbeat evidence, deploy robots, and provide lifecycle support.",
  ],
  [
    "Heartbeat Verification",
    "What is a verified operating hour?",
    "Qualifying operating time supported by valid heartbeat evidence and eligible assignment context. Scheduled or available time alone is not verified.",
  ],
  [
    "Heartbeat Verification",
    "How does the robot heartbeat work?",
    "Approved manufacturer software submits authenticated operational evidence tied to a serial-identified robot and eligible assignment, with duplicate and replay controls.",
  ],
  [
    "Heartbeat Verification",
    "Does RoboWorkPool require a separate tracking device?",
    "Not by default. Approved manufacturer software sends the required heartbeat evidence; separate tracking hardware is not normally required.",
  ],
  [
    "Downpayment Queue",
    "How does the Downpayment Queue work?",
    "Each qualifying downpayment receives chronological order within its program. When an approved contract is fulfilled and purchase creation is authorized, eligible positions are selected in order and linked to auditable purchase and ownership records.",
  ],
  [
    "Operations",
    "What happens if a robot goes offline or needs repair?",
    "Offline, inactive, maintenance, suspension, and replacement remain distinct states. Authorized participants can report issues and follow controlled recovery, maintenance, or replacement workflows.",
  ],
  [
    "Hiring Companies",
    "How does training-data setup work?",
    "When a manufacturer requires human demonstrations, it defines the requirements and coordinates with the Hiring Company through RoboWorkPool. Compatible third-party capture equipment may be identified and the company receives guided setup. This is not a separate worker marketplace or payout role.",
  ],
  [
    "General",
    "Is RoboWorkPool an open bidding marketplace?",
    "No. Hiring Companies contract with Robot Manufacturers, which confirm fulfillment and allocate compatible eligible robots.",
  ],
  [
    "Robot Owners",
    "How many robots may one owner manage?",
    "The current configurable maximum is 20 active Robot Equivalents.",
  ],
  [
    "Hiring Companies",
    "Are scheduled hours billed?",
    "No. Scheduling alone does not create a charge. Billing is based on finalized verified operating time.",
  ],
  [
    "Heartbeat Verification",
    "Does heartbeat prove task quality?",
    "No. It supports connectivity and operational-state evidence, not work quality, task completion, or safety compliance by itself.",
  ],
  [
    "Billing",
    "What is the company rate?",
    "At the current configuration, a $5.00 verified operating base plus a 15% company fee produces a $5.75 example total per verified hour, before applicable approved additions or credits.",
  ],
  [
    "Payroll",
    "When is an owner paid?",
    "Only after internal finalization, payout eligibility, applicable company settlement, submission to the provider, and provider confirmation. Accrued is not paid.",
  ],
  [
    "Security",
    "Can public search reveal robots or contracts?",
    "No. Public search is limited to approved public pages, FAQs, legal content, and public documentation.",
  ],
] as const;
function FAQ() {
  const [query, setQuery] = useState("");
  const filtered = faqs.filter((x) =>
    x.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Page
      meta={{
        title: "RoboWorkPool FAQ",
        description:
          "Search answers about ownership, hiring, manufacturers, verified time, billing, payouts, queue rules, maintenance, and security.",
        canonical: "/roboworkpool/faq",
        schema: {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map(([, q, a]) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        },
      }}
      title="Questions, answered precisely"
      intro="This page provides version-controlled answers for first-time visitors across every RoboWorkPool participant and lifecycle stage."
    >
      <label className="public-search">
        Search public questions
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “verified time” or “queue"
        />
      </label>
      <p role="status">
        {filtered.length} question{filtered.length === 1 ? "" : "s"} found
      </p>
      <div className="faq-list">
        {filtered.map(([category, q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <small>{category}</small>
            <p>{a}</p>
          </details>
        ))}
      </div>
      {filtered.length === 0 && (
        <Alert title="No matching public answer">
          Try a broader term or visit support. Public search never includes accounts,
          robots, contracts, invoices, queue positions, or heartbeat records.
        </Alert>
      )}
    </Page>
  );
}

/* Republic and Med Pool page source is intentionally retained outside the active public route registry. */
void function ProductPage({ product }: { product: "republic" | "med" }) {
  const republic = product === "republic";
  const title = republic ? "Republic" : "Med Pool";
  return (
    <Page
      meta={{
        title,
        description: republic
          ? "Learn how Republic is separate from RoboWorkPool within the Nation Reserve product family."
          : "Learn about the Med Pool future concept for medicine manufacturing teams and staged development pools.",
        canonical: republic ? "/republic" : "/med-pool",
      }}
      title={title}
      intro={
        republic
          ? "This page introduces Republic as a separate Nation Reserve product. Republic is not a RoboWorkPool feature, and its final public website and app-download destinations are awaiting approval."
          : "This page introduces Med Pool as a separate future Nation Reserve product concept focused on medicine manufacturing teams, donation pools, discovery, validation, clinical stages, manufacturing, and transparent pipeline context."
      }
    >
      <Section
        title={republic ? "A separate product experience" : "A staged future vision"}
      >
        {republic ? (
          <>
            <p>
              Nation Reserve may provide shared account identity across products, but
              Republic has its own purpose, routes, policies, and product experience.
            </p>
            <Alert title="Publication dependency">
              Verified external website and app-store URLs have not been supplied.
              Placeholder links are intentionally not published.
            </Alert>
            <Button disabled>Visit Republic website — link pending</Button>
          </>
        ) : (
          <>
            <Steps
              items={[
                "Medicine manufacturing teams",
                "Donation pools",
                "Discovery",
                "Preclinical validation",
                "Clinical development",
                "Manufacturing",
                "Pipeline communication",
              ].map((title, index) => ({
                title,
                text:
                  index < 2
                    ? "A proposed collaboration and funding context subject to future product, medical, legal, and compliance definition."
                    : "A future lifecycle stage; this website does not claim a treatment is validated, approved, or available.",
              }))}
            />
            <Alert tone="warning" title="Future product boundary">
              Med Pool is not implemented and this overview is not medical advice, an
              offering, or a claim of clinical efficacy.
            </Alert>
          </>
        )}
      </Section>
    </Page>
  );
};

function About() {
  return (
    <Page
      meta={{
        title: "About Nation Reserve",
        description:
          "Learn Nation Reserve’s mission, product principles, and long-term vision for accountable operational platforms.",
        canonical: "/about",
      }}
      title="Infrastructure people can understand and verify"
      intro="This page introduces Nation Reserve, its mission, product family, operating principles, and long-term vision without unsupported leadership, history, or market claims."
    >
      <Section title="Our mission">
        <p>
          Nation Reserve builds accountable platforms that connect complex real-world
          participation with understandable identity, permissions, evidence, and
          records.
        </p>
      </Section>
      <Section title="Product principles">
        <Cards>
          <InfoCard title="Clarity">
            <p>
              Users should understand what a service does, what each state means, and
              what happens next.
            </p>
          </InfoCard>
          <InfoCard title="Evidence">
            <p>
              Operational and financial claims should be tied to controlled source
              records.
            </p>
          </InfoCard>
          <InfoCard title="Boundaries">
            <p>
              Distinct products, organizations, roles, and authoritative systems remain
              explicit.
            </p>
          </InfoCard>
        </Cards>
      </Section>
      <Section title="RoboWorkPool by Nation Reserve">
        <p>
          RoboWorkPool focuses Nation Reserve’s accountable platform principles on
          verified robot workforce demand, productive ownership, manufacturer
          fulfillment, and auditable operation.
        </p>
        <div className="public-actions">
          <LinkButton href="/roboworkpool">Explore RoboWorkPool</LinkButton>
        </div>
      </Section>
      <Alert title="Company information pending approval">
        Final legal-entity address, leadership profiles, and company history have not
        been supplied and are not invented here.
      </Alert>
    </Page>
  );
}

function Contact() {
  const [done, setDone] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    track("public.contact.submitted", { delivery: "not_configured" });
    setDone(true);
  }
  return (
    <Page
      meta={{
        title: "Contact Nation Reserve",
        description:
          "Find the correct Nation Reserve contact path for sales, ownership, manufacturers, integrations, billing, security, press, or legal questions.",
        canonical: "/contact",
      }}
      title="Reach the right Nation Reserve team"
      intro="This page helps route Hiring Company sales, Robot Owner support, manufacturer partnerships, technical integration, billing, security, press, and legal questions."
    >
      {done ? (
        <Alert title="Your request is prepared, but not delivered">
          A production contact-delivery endpoint and approved addresses have not been
          supplied. No message was transmitted. Please return when an approved contact
          channel is published.
        </Alert>
      ) : (
        <form className="public-form" onSubmit={submit}>
          <div className="public-form-grid">
            <label>
              Name
              <input required name="name" autoComplete="name" />
            </label>
            <label>
              Email
              <input required type="email" name="email" autoComplete="email" />
            </label>
            <label>
              Organization
              <input name="organization" autoComplete="organization" />
            </label>
            <label>
              Contact category
              <select required name="category" defaultValue="">
                <option value="" disabled>
                  Choose a category
                </option>
                {[
                  "Hiring Company Sales",
                  "Robot Owner Support",
                  "Manufacturer Partnerships",
                  "Technical Integration",
                  "Billing",
                  "Security",
                  "Press",
                  "Legal",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Subject
            <input required name="subject" />
          </label>
          <label>
            Message
            <textarea required name="message" rows={7} />
          </label>
          <label className="check">
            <input required type="checkbox" /> I understand this general form must not
            contain passwords, API secrets, bank details, identity documents, or other
            sensitive records.
          </label>
          <Button type="submit">Prepare contact request</Button>
        </form>
      )}
      <Alert tone="warning" title="Do not send sensitive records">
        Never submit passwords, API secrets, bank details, tax identifiers, or identity
        documents through a general contact channel.
      </Alert>
    </Page>
  );
}
function Support() {
  return (
    <Page
      meta={{
        title: "RoboWorkPool support",
        description:
          "Find help for accounts, robot operations, billing, manufacturer integration, accessibility, security, and service status.",
        canonical: "/support",
      }}
      title="Help that starts with the right context"
      intro="This page routes public visitors and users to account, operations, billing, manufacturer integration, accessibility, security, FAQ, and service-status resources."
    >
      <Cards>
        {[
          [
            "Account and access",
            "Login, verification, recovery, sessions, roles, and organization selection.",
            "/login",
          ],
          [
            "Robot operations",
            "Assignments, heartbeat, inactivity, maintenance, replacement, and serial accountability.",
            "/roboworkpool/how-it-works",
          ],
          [
            "Billing and payouts",
            "Verified time, invoices, payment states, statements, holds, and payout readiness.",
            "/roboworkpool/pricing",
          ],
          [
            "Manufacturer integration",
            "Application, sandbox, credentials, models, heartbeat, and production readiness.",
            "/roboworkpool/manufacturers",
          ],
          [
            "Frequently asked questions",
            "Search approved public answers across participant types.",
            "/roboworkpool/faq",
          ],
          [
            "Service availability",
            "Review public subsystem status without infrastructure details.",
            "/status",
          ],
        ].map(([title, text, href]) => (
          <InfoCard key={title} title={title!} href={href!}>
            <p>{text}</p>
          </InfoCard>
        ))}
      </Cards>
      <p>
        <a href="/accessibility">Accessibility support</a> ·{" "}
        <a href="/contact">Contact routing</a>
      </p>
    </Page>
  );
}
function Status() {
  const services = [
    "Web application",
    "Client API",
    "Manufacturer API",
    "Heartbeat ingestion",
    "Authentication",
    "Billing",
    "Notifications",
    "Documentation",
  ];
  return (
    <Page
      meta={{
        title: "Service status",
        description:
          "View the public availability state of major Nation Reserve and RoboWorkPool services.",
        canonical: "/status",
      }}
      title="RoboWorkPool service status"
      intro="This page communicates major service availability without exposing infrastructure topology or sensitive operational details."
    >
      <Alert title="Live monitoring feed not connected">
        No validated public status feed is configured. RoboWorkPool will not display
        invented uptime statistics or placeholder incident history.
      </Alert>
      <div className="status-public-list">
        {services.map((name) => (
          <div key={name}>
            <span>{name}</span>
            <StatusBadge status="general.active" />
            <small>Status awaiting live feed</small>
          </div>
        ))}
      </div>
      <p>
        Possible published states are Operational, Degraded performance, Partial outage,
        Major outage, and Maintenance. Incident updates will include start, update,
        resolution time, and a plain-language summary when the approved feed is
        available.
      </p>
    </Page>
  );
}
const legalCopy = {
  privacy: {
    title: "Privacy policy summary",
    intro:
      "This page describes the current privacy architecture at a high level. Final jurisdiction-specific policy language, legal entity address, effective date, and rights channels require legal approval.",
    sections: [
      [
        "Data categories",
        "Account and organization information, operational records, support interactions, security evidence, and necessary financial references may be processed according to role and purpose.",
      ],
      [
        "Access and separation",
        "Public content does not contain authenticated organization data. Role, permission, and organization scope limit application access.",
      ],
      [
        "Retention and rights",
        "Retention, deletion, correction, export, and legal-hold handling follow documented governance and applicable law. Approved request channels are pending publication.",
      ],
      [
        "Sensitive data",
        "Public analytics must not capture passwords, API secrets, bank details, identity documents, tax identifiers, or private heartbeat payloads.",
      ],
    ],
  },
  terms: {
    title: "Terms of service summary",
    intro:
      "This page outlines subjects the final Terms of Service must govern. It is not a substitute for approved legal terms and does not create a public enrollment offer.",
    sections: [
      [
        "Participation",
        "Eligibility, verification, account security, organizational authority, acceptable use, suspension, and termination.",
      ],
      [
        "Operations",
        "Manufacturer fulfillment, robot capability, contracts, assignments, heartbeat evidence, maintenance, replacement, and jurisdictional limits.",
      ],
      [
        "Financial conditions",
        "Versioned rates and fees, verified-time calculation, invoices, collections, earnings, payout eligibility, holds, disputes, taxes, refunds, and adjustments.",
      ],
      [
        "No guarantees",
        "No guaranteed utilization, earnings, capacity, performance, queue date, compatibility, or universal legal authorization.",
      ],
    ],
  },
  accessibility: {
    title: "Accessibility commitment",
    intro:
      "This page explains Nation Reserve’s commitment to an understandable, keyboard-accessible, responsive RoboWorkPool experience targeting WCAG 2.2 AA.",
    sections: [
      [
        "Supported access",
        "Semantic landmarks, headings, labels, visible focus, keyboard operation, textual status, reduced motion, sufficient contrast, and responsive layouts.",
      ],
      [
        "Compatibility",
        "The experience is designed for current browsers, larger text, zoom, and common assistive technologies; manual conformance review remains ongoing.",
      ],
      [
        "Feedback",
        "An approved accessibility-feedback address is pending publication. The contact page can identify the category but currently does not transmit requests.",
      ],
      [
        "Known review work",
        "Full browser axe review, screen-reader validation, dark-theme visual review, and 200% zoom approval remain tracked.",
      ],
    ],
  },
  cookies: {
    title: "Cookie policy summary",
    intro:
      "This page explains the intended separation between necessary account technologies and optional public analytics. Final consent categories and vendor details depend on deployment.",
    sections: [
      [
        "Necessary technologies",
        "Security, authentication, organization context, preferences, and fraud controls may require cookies or equivalent storage.",
      ],
      [
        "Optional analytics",
        "Public conversion measurement must avoid sensitive content and follow applicable consent requirements.",
      ],
      [
        "Choice",
        "Optional analytics should default according to applicable law and published consent configuration.",
      ],
      [
        "No invented vendors",
        "No analytics or advertising vendor is claimed until it is actually configured and reviewed.",
      ],
    ],
  },
  acceptable: {
    title: "Acceptable use summary",
    intro:
      "This page describes the conduct expected when using Nation Reserve public and authenticated services. Final enforceable language requires approval.",
    sections: [
      [
        "Protect systems",
        "Do not probe, disrupt, bypass access controls, replay signed messages, or misuse credentials.",
      ],
      [
        "Protect people and data",
        "Do not submit unlawful, deceptive, unsafe, infringing, or unauthorized personal or confidential information.",
      ],
      [
        "Accurate participation",
        "Do not falsify identity, ownership, manufacturer approval, robot state, operating evidence, contracts, or financial records.",
      ],
      [
        "Reporting",
        "Use approved support or security channels for suspected abuse and avoid public disclosure of sensitive details.",
      ],
    ],
  },
  api: {
    title: "Manufacturer API terms summary",
    intro:
      "This page identifies subjects for approved Manufacturer API Terms without exposing production security architecture or granting production access.",
    sections: [
      [
        "Approval and credentials",
        "Sandbox and production access are separate. Credentials are confidential, scoped, rotated, and revocable.",
      ],
      [
        "Requests",
        "Manufacturers must follow signing, timestamp, sequence, idempotency, retry, rate-limit, and registration contracts.",
      ],
      [
        "Evidence integrity",
        "Do not fabricate robot identity, heartbeat state, runtime, ownership, fulfillment, or incident evidence.",
      ],
      [
        "Operations and suspension",
        "Nation Reserve may restrict credentials or robots for security, safety, compliance, incident response, or contract reasons.",
      ],
    ],
  },
} as const;
function Legal({ kind }: { kind: keyof typeof legalCopy }) {
  const copy = legalCopy[kind];
  const canonical =
    kind === "acceptable"
      ? "/legal/acceptable-use"
      : kind === "api"
        ? "/legal/manufacturer-api-terms"
        : kind === "cookies"
          ? "/legal/cookies"
          : `/${kind}`;
  return (
    <Page
      meta={{ title: copy.title, description: copy.intro, canonical }}
      title={copy.title}
      intro={copy.intro}
    >
      <Alert tone="warning" title="Legal review required">
        This controlled implementation summary must not be represented as final legal
        advice or approved contractual language.
      </Alert>
      {copy.sections.map(([title, text]) => (
        <Section key={title} title={title}>
          <p>{text}</p>
        </Section>
      ))}
    </Page>
  );
}
function PublicError({ code }: { code: number }) {
  const copy: Record<number, [string, string]> = {
    400: [
      "Invalid request",
      "Review the address or submitted information and try again.",
    ],
    401: [
      "Authentication required",
      "Sign in to continue to the requested account area.",
    ],
    403: ["Access denied", "Your current context does not allow this action."],
    404: ["Page not found", "The page may have moved or the address may be incorrect."],
    429: [
      "Too many requests",
      "Wait before trying again. Repeated submission can delay recovery.",
    ],
    500: ["Unexpected error", "RoboWorkPool could not complete the request."],
    503: [
      "Temporarily unavailable",
      "The service is temporarily unavailable; your data is not assumed lost.",
    ],
  };
  const [title, text] = copy[code] ?? copy[500]!;
  return (
    <Page
      meta={{
        title: `${code} — ${title}`,
        description: text,
        canonical: `/errors/${code}`,
      }}
      title={`${code} — ${title}`}
      intro={text}
    >
      <p>
        Support reference: <code>RWP-PUBLIC-{code}</code>
      </p>
      <div className="public-actions">
        <LinkButton href="/">Return home</LinkButton>
        <LinkButton href="/support" secondary>
          Get support
        </LinkButton>
        {code === 503 && (
          <LinkButton href="/status" secondary>
            View status
          </LinkButton>
        )}
      </div>
    </Page>
  );
}

const aliases: Record<string, string> = {
  "/how-it-works": "/roboworkpool/how-it-works",
  "/hire-robots": "/roboworkpool/hiring-companies",
  "/own-robots": "/roboworkpool/robot-owners",
  "/manufacturers": "/roboworkpool/manufacturers",
  "/heartbeat-api": "/roboworkpool/heartbeat-api",
  "/pricing": "/roboworkpool/pricing",
  "/downpayment-queue": "/roboworkpool/downpayment-queue",
  "/safety-and-trust": "/roboworkpool/trust-and-verification",
  "/faq": "/roboworkpool/faq",
  "/legal/privacy": "/privacy",
  "/legal/terms": "/terms",
};
// eslint-disable-next-line react-refresh/only-export-components
export const publicRoutes = [
  "/",
  "/roboworkpool",
  "/roboworkpool/how-it-works",
  "/roboworkpool/robot-owners",
  "/roboworkpool/hiring-companies",
  "/roboworkpool/manufacturers",
  "/roboworkpool/heartbeat-api",
  "/roboworkpool/pricing",
  "/roboworkpool/downpayment-queue",
  "/roboworkpool/trust-and-verification",
  "/roboworkpool/faq",
  "/about",
  "/contact",
  "/support",
  "/status",
  "/privacy",
  "/terms",
  "/accessibility",
  "/legal/cookies",
  "/legal/acceptable-use",
  "/legal/manufacturer-api-terms",
  ...Object.keys(aliases),
];
// eslint-disable-next-line react-refresh/only-export-components
export function isPublicRoute(path: string) {
  return (
    publicRoutes.includes(path) ||
    /^\/errors\/(400|401|403|404|429|500|503)$/.test(path)
  );
}
export function PublicPage({ path }: PublicPageProps) {
  const route = aliases[path] ?? path;
  if (route === "/") return <Home />;
  if (route === "/roboworkpool") return <Overview />;
  if (route === "/roboworkpool/how-it-works") return <HowItWorks />;
  if (route === "/roboworkpool/robot-owners") return <PersonaPage kind="owner" />;
  if (route === "/roboworkpool/hiring-companies") return <PersonaPage kind="company" />;
  if (route === "/roboworkpool/manufacturers")
    return <PersonaPage kind="manufacturer" />;
  if (route === "/roboworkpool/pricing") return <Pricing />;
  if (route === "/roboworkpool/trust-and-verification") return <Trust />;
  if (route === "/roboworkpool/heartbeat-api") return <Heartbeat />;
  if (route === "/roboworkpool/downpayment-queue") return <Queue />;
  if (route === "/roboworkpool/faq") return <FAQ />;
  if (route === "/about") return <About />;
  if (route === "/contact") return <Contact />;
  if (route === "/support") return <Support />;
  if (route === "/status") return <Status />;
  if (route === "/privacy") return <Legal kind="privacy" />;
  if (route === "/terms") return <Legal kind="terms" />;
  if (route === "/accessibility") return <Legal kind="accessibility" />;
  if (route === "/legal/cookies") return <Legal kind="cookies" />;
  if (route === "/legal/acceptable-use") return <Legal kind="acceptable" />;
  if (route === "/legal/manufacturer-api-terms") return <Legal kind="api" />;
  const match = route.match(/^\/errors\/(\d+)$/);
  return <PublicError code={Number(match?.[1] ?? 404)} />;
}
