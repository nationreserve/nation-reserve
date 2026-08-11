import { useEffect, type ReactNode } from "react";
import { Alert } from "@nation-reserve/design-system";
import { PublicShell } from "@nation-reserve/application-shell";

const paths = {
  company: "/roboworkpool/hiring-companies",
  owner: "/roboworkpool/robot-owners",
  manufacturer: "/roboworkpool/manufacturers",
};

function Section({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`public-section ${className}`}>
      {eyebrow && <p className="nr-eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Action({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      className={`nr-button nr-button--${secondary ? "secondary" : "primary"}`}
      href={href}
    >
      {children}
    </a>
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
function ValueCard({
  eyebrow,
  title,
  children,
  href,
  label,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  href: string;
  label: string;
}) {
  return (
    <article className="public-card homepage-value-card">
      <p className="nr-eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      {children}
      <a href={href}>
        {label} <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

const lifecycle = [
  {
    title: "Company defines workforce demand",
    text: "A Hiring Company defines the work, quantity, location, and operating requirements.",
  },
  {
    title: "RoboWorkPool connects eligible ownership + manufacturer supply",
    text: "Approved demand is connected with ownership capacity and a compatible Robot Manufacturer.",
  },
  {
    title: "Manufacturer fulfills the robot",
    text: "The manufacturer confirms capability, fulfills the approved order, and assigns a unique serial identifier.",
  },
  {
    title: "Robot receives a serial-linked contract assignment",
    text: "The robot, contract, schedule, and responsible organizations remain linked.",
  },
  {
    title: "Robot performs company work",
    text: "The deployed robot performs the work defined by its approved assignment.",
  },
  {
    title: "Heartbeat evidence verifies qualifying operation",
    text: "Authenticated manufacturer integration supplies evidence for qualifying operating time.",
  },
  {
    title: "Billing and earnings follow verified work",
    text: "Finalized verified work supports company billing and applicable participant earnings.",
  },
];

const trust = [
  [
    "Unique serial identity",
    "Each production robot has durable manufacturer and serial accountability.",
  ],
  [
    "Signed heartbeat evidence",
    "Approved integrations submit authenticated evidence with duplicate and replay controls.",
  ],
  [
    "No separate tracking device",
    "Manufacturer software provides heartbeat evidence; a dedicated external uptime device is not required by default.",
  ],
  [
    "Auditable records",
    "Ownership, contracts, assignments, maintenance, and financial changes retain controlled history.",
  ],
  [
    "Operational recovery",
    "Offline, maintenance, suspension, and replacement states remain distinct and reviewable.",
  ],
  [
    "Permission boundaries",
    "Users see only data and actions allowed for their active organization and role.",
  ],
];

const homepageFaqs = [
  [
    "What is RoboWorkPool?",
    "A network connecting company robot-labor demand, productive robot ownership, and approved robot manufacturers through verified contracts and operation.",
  ],
  [
    "How can Robot Owners earn?",
    "Eligible whole or fractional ownership can earn its applicable share when assigned robot capacity performs verified paid work and payout conditions are met.",
  ],
  [
    "Are Robot Owner earnings guaranteed?",
    "No. Utilization, operation, company payment, fees, ownership share, holds, and payout requirements affect earnings.",
  ],
  [
    "Does a Hiring Company have to purchase the robots?",
    "Not in the normal RoboWorkPool model. Approved ownership capacity and manufacturer fulfillment can support the fleet behind contracted robot labor.",
  ],
  [
    "How do manufacturers sell robots?",
    "Approved manufacturers register compatible models, match workforce demand, fulfill orders, integrate heartbeat evidence, and support deployments.",
  ],
  [
    "How does the robot heartbeat work?",
    "Approved manufacturer software submits authenticated evidence tied to serial-identified robots and assignments; separate tracking hardware is not required by default.",
  ],
];

export function Homepage() {
  useEffect(() => {
    document.title = "The workforce. Reconnected. | RoboWorkPool by Nation Reserve";
    let description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }
    description.content =
      "Automate work, own productive robot capacity, or sell more robots through one verified workforce network.";
  }, []);
  return (
    <PublicShell>
      <article className="public-page public-home">
        <section className="public-hero">
          <div>
            <p className="nr-eyebrow">Nation Reserve presents RoboWorkPool</p>
            <h1>The workforce. Reconnected.</h1>
            <p className="public-hero-copy">
              RoboWorkPool connects companies that need robot labor, people who want to
              own productive robot capacity, and manufacturers ready to deploy robots.
              <strong className="public-value-line">
                Automate work. Own productive robots. Sell more robots.
              </strong>
            </p>
            <div className="public-actions">
              <Action href={paths.company}>Automate my company</Action>
              <Action href={paths.owner} secondary>
                Own robots &amp; earn
              </Action>
              <Action href={paths.manufacturer} secondary>
                Sell robots through RoboWorkPool
              </Action>
            </div>
            <a href="/roboworkpool/how-it-works">Learn how it works</a>
          </div>
          <div className="network-visual" aria-label="RoboWorkPool ecosystem">
            <span>
              <b>Hiring Company</b>
              <br />
              <small>Needs robot labor</small>
            </span>
            <i>connects through</i>
            <strong>RoboWorkPool</strong>
            <div className="network-branches">
              <span>
                <b>Robot Owner</b>
                <br />
                <small>Owns capacity</small>
              </span>
              <span>
                <b>Manufacturer</b>
                <br />
                <small>Supplies robot</small>
              </span>
            </div>
            <i>enables</i>
            <span>
              <b>Verified robot work</b>
            </span>
            <div className="network-outcomes">
              <span>Company gets labor</span>
              <span>Owner earns</span>
              <span>Manufacturer sells robots</span>
            </div>
          </div>
        </section>

        <Section
          eyebrow="Built for every side of the workforce"
          title="One network. Three ways to participate."
        >
          <p>
            RoboWorkPool connects the people who use robots, own robot capacity, and
            manufacture the machines.
          </p>
          <div className="public-card-grid public-card-grid--3">
            <ValueCard
              eyebrow="Robot Owners"
              title="Own robots that can work for you."
              href={paths.owner}
              label="Explore robot ownership"
            >
              <p>
                Own whole or fractional robot capacity that can be deployed into paid
                company contracts. When eligible robot work is verified, your ownership
                share can generate earnings — creating passive-income potential from
                productive robots.
              </p>
              <ul>
                <li>Whole or fractional robot ownership</li>
                <li>Earnings tied to verified paid work</li>
                <li>Track robots, hours, earnings, and payouts</li>
              </ul>
            </ValueCard>
            <ValueCard
              eyebrow="Hiring Companies"
              title="Automate without buying the whole fleet."
              href={paths.company}
              label="Automate my company"
            >
              <p>
                Access robotic labor with less upfront equipment cost. RoboWorkPool
                connects your workforce needs with robot manufacturers and robot
                ownership capacity, allowing automation without requiring your company
                to fund every robot itself.
              </p>
              <ul>
                <li>Lower upfront robot acquisition burden</li>
                <li>Contract robot capacity around real workforce needs</li>
                <li>Guided manufacturer training-data setup when required</li>
              </ul>
              <p className="public-card-note">
                Automation can expand while economic participation in the robotic
                workforce extends beyond the company deploying it.
              </p>
            </ValueCard>
            <ValueCard
              eyebrow="Robot Manufacturers"
              title="Sell more robots into the workforce."
              href={paths.manufacturer}
              label="Sell robots through RoboWorkPool"
            >
              <p>
                Connect your robot models to companies with real labor demand.
                RoboWorkPool helps turn approved workforce requirements into robot
                orders, deployments, and ongoing operating relationships.
              </p>
              <ul>
                <li>Reach companies seeking robotic labor</li>
                <li>Convert workforce demand into deployments</li>
                <li>Integrate once with the RoboWorkPool Heartbeat API</li>
              </ul>
            </ValueCard>
          </div>
        </Section>

        <Section
          eyebrow="Why RoboWorkPool?"
          title="Automation needs a better ownership model."
        >
          <p>
            Companies increasingly have the ability to automate work, but purchasing
            large robot fleets upfront can be expensive — and concentrating robot
            ownership inside the companies using them leaves fewer ways for others to
            participate economically in automation.
          </p>
          <p>
            Companies provide workforce demand. Robot Owners provide ownership capacity.
            Robot Manufacturers provide the machines. RoboWorkPool connects them through
            verified contracts and robot operation.
          </p>
          <div className="public-model" aria-label="RoboWorkPool economic model">
            <div className="public-model-side">
              <span>Owner capital / ownership</span>
            </div>
            <div className="public-model-center">
              <span>Company demand</span>
              <strong>RoboWorkPool</strong>
              <span>Robot deployment</span>
            </div>
            <div className="public-model-side">
              <span>Manufacturer supply</span>
            </div>
          </div>
        </Section>

        <Section eyebrow="For Robot Owners" title="Own the robot. Earn from the work.">
          <p>Robot ownership can become productive ownership.</p>
          <Steps
            items={[
              {
                title: "Own",
                text: "Fund eligible whole or fractional robot capacity through the RoboWorkPool ownership process.",
              },
              {
                title: "Deploy",
                text: "That capacity can be connected to approved company demand and a manufacturer-fulfilled robot.",
              },
              {
                title: "Verify",
                text: "RoboWorkPool uses authenticated robot heartbeat evidence to verify qualifying operating time.",
              },
              {
                title: "Earn",
                text: "Verified paid robot work can generate earnings according to your ownership share, contract terms, fees, and payout requirements.",
              },
            ]}
          />
          <p className="public-note">
            No guaranteed utilization or earnings. Earnings depend on eligible
            contracts, verified operation, payment, ownership share, fees, and
            applicable payout conditions.
          </p>
          <Action href={paths.owner}>See how robot ownership works</Action>
        </Section>

        <Section
          eyebrow="For Hiring Companies"
          title="Automation without the traditional fleet purchase."
        >
          <p>
            Instead of requiring a company to purchase every robot upfront, RoboWorkPool
            can connect approved workforce demand with manufacturer fulfillment and
            independently owned robot capacity.
          </p>
          <div className="public-comparison">
            <article>
              <h3>Traditional model</h3>
              <ol>
                <li>Company identifies a labor need</li>
                <li>Company buys the entire robot fleet</li>
                <li>Company deploys its robots</li>
              </ol>
            </article>
            <article>
              <h3>RoboWorkPool model</h3>
              <ol>
                <li>Company defines its labor need</li>
                <li>RoboWorkPool creates the contract</li>
                <li>
                  Manufacturer supply and Robot Owner capacity support fulfillment
                </li>
                <li>Company receives robot labor</li>
              </ol>
            </article>
          </div>
          <p>
            <strong>
              Companies pay for contracted, verified robot work rather than simply
              owning idle equipment.
            </strong>
          </p>
          <div className="public-subsection">
            <h3>Need human demonstrations? We’ll guide the setup.</h3>
            <p>
              When a Robot Manufacturer requires human demonstration data for a
              deployment, RoboWorkPool helps coordinate the process between the
              manufacturer and Hiring Company. The manufacturer defines the
              requirements, compatible third-party capture equipment can be identified,
              and the company receives a guided setup process.
            </p>
          </div>
          <div className="public-actions">
            <Action href={paths.company}>Explore company automation</Action>
          </div>
        </Section>

        <Section
          eyebrow="For Robot Manufacturers"
          title="More workforce demand. More robot deployments."
        >
          <p>
            RoboWorkPool gives approved Robot Manufacturers a path from company
            workforce demand to robot fulfillment. Companies define what work they need
            automated, manufacturers match compatible robots, and RoboWorkPool
            coordinates the ownership, contract, serial identification, and
            verified-operation infrastructure.
          </p>
          <Steps
            items={[
              {
                title: "Register robot models",
                text: "Publish supported capabilities and complete approval requirements.",
              },
              {
                title: "Match compatible workforce demand",
                text: "Review eligible company requirements that fit supported robots.",
              },
              {
                title: "Fulfill robot orders",
                text: "Confirm approved orders and assign unique serial identifiers.",
              },
              {
                title: "Deploy and support robots",
                text: "Integrate heartbeat evidence and support maintenance or replacement throughout operation.",
              },
            ]}
          />
          <p>
            Manufacturers integrate supported robots with the RoboWorkPool Heartbeat API
            so deployed robot operation can be verified without requiring a separate
            dedicated RoboWorkPool tracking device by default.
          </p>
          <Action href={paths.manufacturer}>Explore manufacturer integration</Action>
        </Section>

        <Section eyebrow="The verified lifecycle" title="How RoboWorkPool works">
          <Steps items={lifecycle} />
          <Action href="/roboworkpool/how-it-works">See the complete lifecycle</Action>
        </Section>
        <Section title="Trust is built into the lifecycle">
          <div className="public-card-grid public-card-grid--6">
            {trust.map(([title, text]) => (
              <article className="public-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <Action href="/roboworkpool/trust-and-verification">
            Explore trust and verification
          </Action>
        </Section>
        <Section
          eyebrow="For eligible ownership programs"
          title="A transparent path toward robot ownership"
        >
          <p>
            Eligible Robot Owners may join an approved fulfillment program’s Downpayment
            Queue. Queue order follows qualifying downpayment time, movement is
            auditable, and a selected position can become a purchase order linked
            through fulfillment, serial identity, ownership, and assignment. Estimates
            are not guarantees and personal positions remain private.
          </p>
          <Action href="/roboworkpool/downpayment-queue" secondary>
            Learn about the Downpayment Queue
          </Action>
        </Section>
        <Section title="Common questions">
          <div className="public-card-grid public-card-grid--6">
            {homepageFaqs.map(([question, answer]) => (
              <article className="public-card" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
          <Action href="/roboworkpool/faq" secondary>
            View all FAQs
          </Action>
        </Section>
        <Alert tone="warning" title="Important participation information">
          Robot availability, assignments, utilization, earnings, fulfillment dates, and
          task capability are not guaranteed. Eligibility, verified operation, safety,
          maintenance, demand, fees, taxes, and applicable law affect outcomes.
        </Alert>
        <Section
          eyebrow="Get started"
          title="Choose your place in the robotic workforce."
          className="public-final-cta"
        >
          <div className="public-card-grid public-card-grid--3">
            <ValueCard
              eyebrow="Robot Owner"
              title="Own robots"
              href="/register/robot-owner"
              label="Explore ownership"
            >
              <p>Build passive-income potential through productive robot ownership.</p>
            </ValueCard>
            <ValueCard
              eyebrow="Hiring Company"
              title="Automate my company"
              href="/register/hiring-company"
              label="Hire robots"
            >
              <p>Access robot labor with less upfront equipment cost.</p>
            </ValueCard>
            <ValueCard
              eyebrow="Robot Manufacturer"
              title="Manufacture robots"
              href="/register/manufacturer"
              label="Sell robots"
            >
              <p>Connect your robots to companies ready to put them to work.</p>
            </ValueCard>
          </div>
        </Section>
      </article>
    </PublicShell>
  );
}
