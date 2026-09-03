import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
  Stepper,
} from "@nation-reserve/design-system";
import {
  AuthenticatedShell,
  developmentSessions,
  OrganizationProvider,
} from "@nation-reserve/application-shell";
import { api } from "./auth-client.js";
import { loadStripe } from "@stripe/stripe-js";

type Row = Record<string, unknown>;
type Load = { loading: boolean; data?: unknown; error?: string };
const oid = () =>
  sessionStorage.getItem("nr-active-organization") ??
  sessionStorage.getItem("currentOrganizationId");
const object = (v: unknown): Row => (v && typeof v === "object" ? (v as Row) : {});
const rows = (v: unknown): Row[] =>
  Array.isArray(v)
    ? v.filter((x): x is Row => !!x && typeof x === "object")
    : Array.isArray(object(v).items)
      ? (object(v).items as Row[])
      : [];
const scalar = (v: unknown) =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    ? String(v)
    : "Not available";
const formText = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};
const companyStripeKey = String(import.meta.env["VITE_STRIPE_PUBLISHABLE_KEY"] ?? "");
const companyStripe = companyStripeKey ? loadStripe(companyStripeKey) : null;
const money = (v: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0) / 100,
  );
function useLoad(path?: string) {
  const [state, setState] = useState<Load>({ loading: !!path });
  useEffect(() => {
    if (!path) return;
    let live = true;
    void api
      .get(path)
      .then((data) => {
        if (live) setState({ loading: false, data });
      })
      .catch((e: unknown) => {
        if (live)
          setState({
            loading: false,
            error: e instanceof Error ? e.message : "Unable to load this information.",
          });
      });
    return () => {
      live = false;
    };
  }, [path]);
  return state;
}
function Page({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="company-page">
      <PageHeader eyebrow="Hiring Company" title={title} description={description} />
      {children}
    </section>
  );
}
function Help({ children }: { children: ReactNode }) {
  return (
    <aside className="company-help">
      <h2>What this page is about</h2>
      <p>{children}</p>
    </aside>
  );
}
function Metric({
  name,
  value,
  kind,
  help,
}: {
  name: string;
  value: ReactNode;
  kind: string;
  help: string;
}) {
  return (
    <article className="company-metric">
      <span>{name}</span>
      <strong>{value}</strong>
      <small>{kind}</small>
      <p>{help}</p>
    </article>
  );
}
function Records({
  state,
  empty = "No records yet",
  detail,
}: {
  state: Load;
  empty?: string;
  detail?: (row: Row) => string;
}) {
  if (state.loading) return <p role="status">Loading...</p>;
  if (state.error) return <ErrorState description={state.error} />;
  const data = rows(state.data);
  if (!data.length && state.data && Object.keys(object(state.data)).length)
    data.push(object(state.data));
  if (!data.length)
    return (
      <EmptyState
        title={empty}
        description="No eligible records were returned for the active organization."
      />
    );
  return (
    <div className="company-records">
      {data.map((row, index) => (
        <article className="nr-card" key={scalar(row.id ?? index)}>
          <StatusBadge status="general.active" />
          <h2>{scalar(row.name ?? row.title ?? row.number ?? row.id)}</h2>
          <dl>
            {Object.entries(row)
              .slice(0, 9)
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll("_", " ")}</dt>
                  <dd>{scalar(value)}</dd>
                </div>
              ))}
          </dl>
          {detail && row.id ? <a href={detail(row)}>View details</a> : null}
        </article>
      ))}
    </div>
  );
}

function Dashboard() {
  const id = oid(),
    dashboard = useLoad(id ? `/api/v1/dashboard?organizationId=${id}` : undefined),
    billing = useLoad(id ? `/api/v1/organizations/${id}/billing/summary` : undefined),
    training = useLoad(
      id ? `/api/v1/organizations/${id}/company/training-requirements` : undefined,
    ),
    d = object(dashboard.data),
    b = object(billing.data),
    required = rows(training.data).filter(
      (x) =>
        x.decision === "TRAINING_DATA_REQUIRED" &&
        x.status !== "TRAINING_DATA_APPROVED",
    );
  return (
    <Page
      title="Hiring Company dashboard"
      description="Operational planning, live robot status, training readiness, contracts, and financial action in one governed view."
    >
      {required.length > 0 && (
        <Alert tone="warning" title="Training data required">
          <p>
            {scalar(required[0]?.manufacturer)} requires human demonstration data before
            this deployment can proceed.
          </p>
          <a href={`/company/training-setup/${scalar(required[0]?.id)}`}>
            View Training Requirements
          </a>
        </Alert>
      )}
      <div className="company-dashboard-controls">
        <label>
          Facility
          <select aria-label="Facility scope">
            <option>All facilities</option>
          </select>
        </label>
        <label>
          Department
          <select aria-label="Department filter">
            <option>All departments</option>
          </select>
        </label>
        <label>
          Date range
          <select aria-label="Date range">
            <option>Today</option>
            <option>Current period</option>
          </select>
        </label>
        <a className="company-primary" href="/company/workforce-plans/new">
          Plan robot work
        </a>
        <a href="/company/live-operations">View live operations</a>
      </div>
      <div className="company-metrics">
        <Metric
          name="Robots scheduled now"
          value="-"
          kind="Scheduled"
          help="Expected under an approved schedule; not verified or billable."
        />
        <Metric
          name="Verified operating now"
          value="-"
          kind="Verified"
          help="Assigned robots currently supplying valid heartbeat evidence."
        />
        <Metric
          name="Offline or missing heartbeat"
          value="-"
          kind="Live status"
          help="Scheduled robots without currently valid evidence."
        />
        <Metric
          name="Open contracts"
          value={scalar(d.open_contracts ?? "-")}
          kind="Contract"
          help="Contracts not completed or cancelled."
        />
        <Metric
          name="Allocated capacity"
          value="-"
          kind="Allocated"
          help="Manufacturer-proposed capacity accepted into assignments."
        />
        <Metric
          name="Verified hours today"
          value={scalar(d.verified_hours_today ?? "-")}
          kind="Verified"
          help="Validated operating intervals today."
        />
        <Metric
          name="Estimated period charges"
          value={money(b.accrued_minor_units)}
          kind="Estimate"
          help="Current-period estimate; not an invoice."
        />
        <Metric
          name="Unpaid invoice balance"
          value={money(b.outstanding_minor_units)}
          kind="Invoiced"
          help="Issued invoice balance not confirmed paid."
        />
        <Metric
          name="Training packages ready"
          value="-"
          kind="Training"
          help="Approved private packages ready to share."
        />
        <Metric
          name="Actions requiring attention"
          value="-"
          kind="Action"
          help="Items blocking readiness, operation, or payment."
        />
      </div>
      <section className="nr-card">
        <h2>Live workforce</h2>
        <div
          className="company-live-summary"
          role="img"
          aria-label="Scheduled, verified online, offline, grace period, maintenance, replacement requested, and unassigned capacity require live operational data"
        >
          <span>Scheduled: -</span>
          <span>Verified online: -</span>
          <span>Offline: -</span>
          <span>Grace period: -</span>
          <span>Maintenance: -</span>
          <span>Replacement requested: -</span>
          <span>Unassigned capacity: -</span>
        </div>
        <p>
          No production values are fabricated. Live values appear only when supplied by
          backend projections.
        </p>
      </section>
      <section className="nr-card">
        <h2>Action center</h2>
        <div className="company-actions">
          {[
            [
              "Complete identity and business verification",
              "/organization/verification",
            ],
            ["Complete payment setup", "/company/billing/payment-methods"],
            ["Finish facility setup", "/company/facilities/new"],
            ["Upload missing training files", "/company/training/uploads/new"],
            ["Test training equipment", "/company/training/equipment"],
            ["Review manufacturer interest", "/company/opportunities"],
            ["Approve contract version", "/company/contracts"],
            ["Investigate inactive robot", "/company/inactive-reports/new"],
            ["Pay invoice", "/company/invoices"],
          ].map(([name, href]) => (
            <a key={name} href={href}>
              {name}
            </a>
          ))}
        </div>
      </section>
      <Help>
        Scheduled robots are expected to work. Verified operating robots are assigned
        robots currently providing valid heartbeat evidence. Billing is based on
        verified operating time, not schedule alone.
      </Help>
    </Page>
  );
}
function Onboarding() {
  const steps = [
    "Company profile",
    "Operations contact",
    "Billing contact",
    "Payment method",
    "Facility",
    "Department",
    "Work area",
    "Safety contact",
    "Initial job",
    "Training method",
    "Sourcing readiness",
  ];
  return (
    <Page
      title="Company setup"
      description="Complete operational prerequisites without blocking exploration of the portal."
    >
      <Stepper current={0} steps={steps.map((label) => ({ label }))} />
      <div className="company-records">
        {steps.map((step, index) => (
          <article className="nr-card" key={step}>
            <h2>{step}</h2>
            <p>
              {index < 8
                ? "Required before an affected contract can activate."
                : "Required when the selected job or sourcing path needs it."}
            </p>
            <a
              href={
                step === "Payment method"
                  ? "/company/billing/payment-methods"
                  : step === "Facility"
                    ? "/company/facilities/new"
                    : step === "Department"
                      ? "/company/departments/new"
                      : step === "Initial job"
                        ? "/company/jobs/new"
                        : "/company/settings"
              }
            >
              Review step
            </a>
          </article>
        ))}
      </div>
      <Help>
        Organization creation establishes identity. This checklist establishes
        operational, safety, billing, worksite, job, training, and sourcing readiness.
      </Help>
    </Page>
  );
}
const resourceInfo: Record<string, { title: string; empty: string; help: string }> = {
  facilities: {
    title: "Facilities",
    empty: "Add your first facility",
    help: "Facilities are private physical operating locations with contacts, hours, access, network, charging, restricted-area, and safety information.",
  },
  departments: {
    title: "Departments",
    empty: "No departments",
    help: "Departments organize workforce ownership within a company and facility.",
  },
  "workforce-plans": {
    title: "Workforce plans",
    empty: "No workforce plans",
    help: "Plans estimate robot needs, readiness, hours, cost, sourcing dates, and conflicts before a formal opportunity.",
  },
  jobs: {
    title: "Job definitions",
    empty: "Create a structured job definition",
    help: "Jobs describe responsibilities, performance, capability, environment, safety, training, and acceptance requirements.",
  },
};
function StructuredResource({
  kind,
  path,
}: {
  kind: keyof typeof resourceInfo;
  path: string;
}) {
  const info = resourceInfo[kind]!,
    orgId = oid(),
    id = path.match(new RegExp(`/company/${kind}/([^/]+)`))?.[1],
    isForm = path.endsWith("/new") || path.endsWith("/edit"),
    state = useLoad(
      orgId && !isForm
        ? `/api/v1/organizations/${orgId}/${kind}${id ? `/${id}` : ""}`
        : undefined,
    ),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    const d = new FormData(e.currentTarget),
      name = formText(d, "Name").trim();
    await api.post(
      `/api/v1/organizations/${orgId}/${kind}`,
      {
        name,
        status: "draft",
        data: Object.fromEntries([...d.entries()].filter(([key]) => key !== "Name")),
      },
      { "Idempotency-Key": crypto.randomUUID() },
    );
    setMessage(`${info.title} record created.`);
  }
  return (
    <Page
      title={
        isForm
          ? `Create ${info.title.toLowerCase()}`
          : id
            ? `${info.title} detail`
            : info.title
      }
      description={info.help}
    >
      {isForm ? (
        <form
          className="company-form"
          onSubmit={(e) =>
            void submit(e).catch((c) =>
              setMessage(c instanceof Error ? c.message : "Unable to save"),
            )
          }
        >
          <StructuredFields kind={kind} />
          <Button>Save</Button>
          {message && <p role="status">{message}</p>}
        </form>
      ) : (
        <Records
          state={state}
          empty={info.empty}
          detail={(row) => `/company/${kind}/${String(row.id)}`}
        />
      )}
      <Help>{info.help}</Help>
    </Page>
  );
}
function StructuredFields({ kind }: { kind: string }) {
  const common = ["Name", "Internal code", "Status", "Notes"],
    facility = [
      "Address",
      "Timezone",
      "Operations contact",
      "Safety contact",
      "Emergency contact",
      "Hours",
      "Access instructions",
      "Network availability",
      "Charging availability",
      "Indoor or outdoor",
      "Restricted areas",
    ],
    plan = [
      "Facility",
      "Department",
      "Work area",
      "Planned start",
      "Duration",
      "Shift pattern",
      "Required robot count",
      "Estimated weekly hours",
      "Budget estimate",
      "Target manufacturer date",
    ],
    job = [
      "Summary",
      "Business purpose",
      "Facility",
      "Department",
      "Work area",
      "Start date",
      "Duration",
      "Shift schedule",
      "Robot quantity",
    ];
  const fields = [
    ...common,
    ...(kind === "facilities"
      ? facility
      : kind === "workforce-plans"
        ? plan
        : kind === "jobs"
          ? job
          : []),
  ];
  return (
    <>
      {fields.map((field) => (
        <label key={field}>
          {field}
          <input name={field} required={field === "Name"} aria-label={field} />
        </label>
      ))}
    </>
  );
}
function WorkArea({ path }: { path: string }) {
  const orgId = oid(),
    isForm = path.endsWith("/new"),
    state = useLoad(
      orgId && !isForm ? `/api/v1/organizations/${orgId}/work-areas` : undefined,
    ),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    const d = new FormData(e.currentTarget);
    await api.post(
      `/api/v1/organizations/${orgId}/work-areas`,
      {
        name: formText(d, "name"),
        status: "draft",
        data: {
          environment: d.get("environment"),
          safety: d.get("safety"),
          access: d.get("access"),
        },
      },
      { "Idempotency-Key": crypto.randomUUID() },
    );
    setMessage("Private work area created.");
  }
  return (
    <Page
      title={isForm ? "Create work area" : "Work areas"}
      description="Private site details for exact robot operating zones."
    >
      {isForm ? (
        <form
          className="company-form"
          onSubmit={(e) =>
            void submit(e).catch((c) =>
              setMessage(c instanceof Error ? c.message : "Unable to save"),
            )
          }
        >
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Environment
            <textarea name="environment" required />
          </label>
          <label>
            Safety and infrastructure
            <textarea name="safety" required />
          </label>
          <label>
            Access restrictions
            <textarea name="access" required />
          </label>
          <Button>Save private work area</Button>
          {message && <p role="status">{message}</p>}
        </form>
      ) : (
        <Records
          state={state}
          detail={(row) => `/company/work-areas/${String(row.id)}`}
        />
      )}
      <section className="nr-card">
        <h2>Private files</h2>
        <p>
          Photos, floor plans, diagrams, and documents remain private company
          information.
        </p>
      </section>
      <Help>
        Work areas remain private and are shared only through explicit authorized access
        grants.
      </Help>
    </Page>
  );
}
function JobBuilder({ path }: { path: string }) {
  void path;
  const orgId = oid(),
    state = useLoad(
      orgId ? `/api/v1/organizations/${orgId}/responsibilities` : undefined,
    ),
    groups = [
      "Primary responsibilities",
      "Secondary responsibilities",
      "Conditional responsibilities",
      "Prohibited activities",
      "Human supervision",
      "Startup tasks",
      "Normal operating tasks",
      "Exception handling",
      "Shutdown tasks",
      "Cleaning and maintenance",
      "Handoff tasks",
    ];
  return (
    <Page
      title="Job responsibilities"
      description="Expanded, hierarchical responsibilities for safe manufacturer review."
    >
      <Records state={state} />
      <div
        className="company-tree"
        role="tree"
        aria-label="Job responsibility hierarchy"
      >
        {groups.map((group) => (
          <details key={group}>
            <summary>{group}</summary>
            <div role="treeitem" tabIndex={0}>
              <strong>Structured task group</strong>
              <p>
                Task, step, expected result, exception path, tools, capabilities, human
                interaction, success, failure, and safety warning.
              </p>
            </div>
          </details>
        ))}
      </div>
      <section className="nr-card">
        <h2>Structured safety and performance</h2>
        <p>
          Hazards, emergency stop, certifications, throughput, accuracy, load, reach,
          speed, precision, environment, collaboration, and acceptance testing remain
          explicit fields.
        </p>
      </section>
      <a href="/company/responsibilities/new">Add versioned responsibility</a>
      <Help>
        Safety requirements cannot be hidden in unstructured notes. Resource versions
        and audit events preserve what manufacturers reviewed.
      </Help>
    </Page>
  );
}
function Training({ path }: { path: string }) {
  const orgId = oid(),
    equipment = path.includes("equipment"),
    uploads = path.includes("uploads"),
    packages = path.includes("packages"),
    sessions = path.includes("sessions"),
    resource = uploads
      ? "training-uploads"
      : packages
        ? "training-packages"
        : sessions
          ? "training-sessions"
          : "training-equipment",
    state = useLoad(
      equipment
        ? "/api/v1/training-equipment"
        : orgId
          ? `/api/v1/organizations/${orgId}/${resource}`
          : undefined,
    ),
    title = equipment
      ? "Motion-training equipment"
      : uploads
        ? "Training uploads"
        : packages
          ? "Training packages"
          : sessions
            ? "Training sessions"
            : "Training method assessment";
  return (
    <Page
      title={title}
      description="Private training preparation with governed equipment and data access."
    >
      <Records state={state} />
      {equipment && (
        <Alert title="Third-party purchasing boundary">
          Catalog links lead to external sellers. No device is labeled compatible
          without manufacturer- and robot-system-specific approved evidence.
        </Alert>
      )}
      {uploads && (
        <section className="nr-card">
          <h2>Secure uploads</h2>
          <p>
            Uploads use private object keys, short-lived signed multipart URLs,
            resumable transfer, and integrity validation.
          </p>
          <p>
            Malware scanning, quarantine, retention, deletion, and legal-hold controls
            protect every stored version.
          </p>
        </section>
      )}
      {uploads && (
        <p>
          Files remain in quarantine until the security scan reports a clean result.
        </p>
      )}
      {packages && (
        <section className="nr-card">
          <h2>Versioned access grants</h2>
          <p>
            A specific immutable version is granted to a specific manufacturer for a
            bounded purpose and expiration.
          </p>
        </section>
      )}
      <Help>
        Training data remains private company information and access is enforced by
        backend permissions and explicit grants.
      </Help>
    </Page>
  );
}
function CompanyWorkOrders({ path }: { path: string }) {
  const orgId = oid(),
    id = path.match(/\/company\/work-orders\/([^/]+)/)?.[1],
    isForm = path.endsWith("/new"),
    state = useLoad(
      orgId && !isForm
        ? `/api/v1/organizations/${orgId}/work-orders${id ? `/${id}` : ""}`
        : undefined,
    ),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    const d = new FormData(e.currentTarget);
    await api.post(
      `/api/v1/organizations/${orgId}/work-orders`,
      {
        name: formText(d, "name"),
        status: formText(d, "status"),
        data: {
          industry: d.get("industry"),
          serviceRegion: d.get("serviceRegion"),
          requiredCapability: d.get("requiredCapability"),
          publishedSummary: {
            responsibility: formText(d, "summary"),
            locationPrecision: formText(d, "locationPrecision"),
          },
        },
      },
      { "Idempotency-Key": crypto.randomUUID() },
    );
    setMessage("Work order saved with the selected discovery visibility.");
  }
  return (
    <Page
      title={
        isForm
          ? "Create open work order"
          : id
            ? "Company work order"
            : "Open work orders"
      }
      description="Publish a limited discovery summary while preserving private operational data."
    >
      {isForm ? (
        <form
          className="company-form"
          onSubmit={(e) =>
            void submit(e).catch((c) =>
              setMessage(c instanceof Error ? c.message : "Unable to save"),
            )
          }
        >
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Visibility
            <select name="status">
              <option value="draft">Private draft</option>
              <option value="published">Approved manufacturers</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label>
            Industry
            <input name="industry" required />
          </label>
          <label>
            Service region
            <input name="serviceRegion" required />
          </label>
          <label>
            Required capability
            <input name="requiredCapability" required />
          </label>
          <label>
            Published location precision
            <input name="locationPrecision" required />
          </label>
          <label>
            Public responsibility summary
            <textarea name="summary" required />
          </label>
          <Button>Save work order</Button>
          {message && <p role="status">{message}</p>}
        </form>
      ) : (
        <Records
          state={state}
          detail={(row) => `/company/work-orders/${String(row.id)}`}
        />
      )}
      {path.endsWith("manufacturer-interest") && (
        <Alert title="Inbound private interest">
          Review the manufacturer profile, models, questions, access requests, and
          conversion options privately. Other manufacturers cannot see this interest or
          response.
        </Alert>
      )}
      {path.endsWith("access-requests") && (
        <Alert title="Explicit expanded-access grant">
          Grant a specific responsibility set and training package version to one
          manufacturer for a bounded purpose and expiration.
        </Alert>
      )}
      <section className="nr-card">
        <h2>Company-controlled discovery</h2>
        <p>
          Exact address, floor plans, identities, security instructions, training files,
          confidential processes, and internal contacts remain private until explicitly
          granted.
        </p>
      </section>
      <Help>An open work order is a limited discovery listing, not a public bid.</Help>
    </Page>
  );
}
function Sourcing({ path }: { path: string }) {
  const orgId = oid(),
    opportunity = path.includes("opportunities"),
    state = useLoad(
      opportunity && orgId ? `/api/v1/organizations/${orgId}/opportunities` : undefined,
    );
  return (
    <Page
      title={opportunity ? "Private opportunities" : "Manufacturer sourcing"}
      description="Private sourcing, responses, and communication without open-marketplace behavior."
    >
      {opportunity ? (
        <Records
          state={state}
          detail={(row) => `/company/opportunities/${String(row.id)}`}
        />
      ) : (
        <p>
          <a href="/company/manufacturers">Browse approved manufacturers</a> or{" "}
          <a href="/company/conversations">open private conversations</a>.
        </p>
      )}
      <Help>
        Recipients normally cannot see other recipients, and cannot see another
        manufacturer&apos;s response, pricing, attachments, or private conversation.
      </Help>
    </Page>
  );
}
function ContractCreate() {
  const organizationId = oid(),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!organizationId) {
      setMessage("Choose a Hiring Company organization first.");
      return;
    }
    const d = new FormData(e.currentTarget),
      departmentValue = d.get("departmentId"),
      department = typeof departmentValue === "string" ? departmentValue.trim() : "";
    try {
      const result = object(
        await api.post(
          `/api/v1/organizations/${organizationId}/company/contracts`,
          {
            manufacturerId: d.get("manufacturerId"),
            hiringCompanyId: d.get("hiringCompanyId"),
            facilityId: d.get("facilityId"),
            ...(department ? { departmentId: department } : {}),
            contractType: d.get("contractType"),
            priority: d.get("priority"),
            startAt: d.get("startAt"),
            estimatedContractValueCents: Math.round(
              Number(d.get("estimatedContractValueDollars")) * 100,
            ),
            renewalMode: "none",
            models: [
              {
                modelId: d.get("modelId"),
                quantity: Number(d.get("normalConcurrentRobots")),
              },
            ],
            requiredCapabilities: { summary: d.get("capabilities") },
            operatingWindows: {
              normalConcurrentRobots: Number(d.get("normalConcurrentRobots")),
              scheduleNote: d.get("scheduleNote"),
            },
            locationRequirements: { facilityId: d.get("facilityId") },
            specialTerms: {
              trainingDemonstrationRequirements: d.get("trainingRequirements"),
            },
            scheduleRules: [
              {
                timezone: d.get("timezone"),
                dayOfWeek: Number(d.get("dayOfWeek")),
                localStartTime: d.get("localStartTime"),
                localEndTime: d.get("localEndTime"),
                recurrenceStart: d.get("startAt"),
              },
            ],
            scheduleExceptions: [],
          },
          { "Idempotency-Key": crypto.randomUUID() },
        ),
      );
      setMessage("Contract draft created with immutable version 1.");
      if (typeof result.id === "string")
        history.pushState({}, "", `/company/contracts/${result.id}/overview`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Contract creation failed.");
    }
  }
  return (
    <Page
      title="Create contract request"
      description="Define capability, facility, schedule, manufacturer, and the approved normal concurrent robot requirement."
    >
      <Alert tone="warning" title="Normal concurrent purchase limit">
        Future purchase orders cannot exceed the highest approved number of robots
        normally required at the same time. Additional shifts do not multiply this
        limit.
      </Alert>
      <form className="company-form" onSubmit={(e) => void submit(e)}>
        <label>
          Hiring Company ID
          <input name="hiringCompanyId" required />
        </label>
        <label>
          Manufacturer ID
          <input name="manufacturerId" required />
        </label>
        <label>
          Facility ID
          <input name="facilityId" required />
        </label>
        <label>
          Department ID (optional)
          <input name="departmentId" />
        </label>
        <label>
          Robot model ID
          <input name="modelId" required />
        </label>
        <label>
          Normal concurrent robots
          <input
            name="normalConcurrentRobots"
            type="number"
            min="1"
            step="1"
            required
          />
        </label>
        <label>
          Estimated contract value (USD)
          <input
            name="estimatedContractValueDollars"
            type="number"
            min="1"
            step="0.01"
            required
          />
        </label>
        <Alert tone="warning" title="Employer downpayment">
          <p>
            After both parties approve the same contract version, RoboWorkPool requires
            the configured employer downpayment before robots can be allocated. The
            current default is 10% of this estimate. The exact amount is shown before
            payment and work does not begin until Stripe confirms settlement.
          </p>
        </Alert>
        <label>
          Contract type
          <select name="contractType">
            <option value="ongoing">Ongoing</option>
            <option value="fixed_term">Fixed term</option>
            <option value="temporary">Temporary</option>
            <option value="pilot">Pilot</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          Start date
          <input name="startAt" type="date" required />
        </label>
        <label>
          Timezone
          <input name="timezone" defaultValue="UTC" required />
        </label>
        <label>
          Schedule day
          <select name="dayOfWeek">
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
            <option value="0">Sunday</option>
          </select>
        </label>
        <label>
          Local start time
          <input name="localStartTime" type="time" required />
        </label>
        <label>
          Local end time
          <input name="localEndTime" type="time" required />
        </label>
        <label>
          Required capabilities
          <textarea name="capabilities" required />
        </label>
        <label>
          Schedule/work-plan notes
          <textarea name="scheduleNote" required />
        </label>
        <label>
          Training-demonstration requirements (optional)
          <textarea name="trainingRequirements" />
        </label>
        <Button>Create versioned contract draft</Button>
      </form>
      {message && <p role="status">{message}</p>}
      <Help>
        Creation records intended work and schedule. Only qualifying heartbeat evidence
        within an eligible assignment can establish verified payable operation.
      </Help>
    </Page>
  );
}
function Contracts({ path }: { path: string }) {
  const organizationId = oid(),
    id = path.match(/\/company\/contracts\/([^/]+)/)?.[1],
    state = useLoad(
      path === "/company/contracts/new"
        ? undefined
        : organizationId
          ? `/api/v1/organizations/${organizationId}/company/contracts${id && !["new"].includes(id) ? `/${id}` : ""}`
          : undefined,
    ),
    [message, setMessage] = useState("");
  if (path === "/company/contracts/new") return <ContractCreate />;
  const detail = object(state.data),
    downpayment = object(detail.employerDownpayment),
    downpaymentStatus = scalar(downpayment.status);
  async function payDownpayment() {
    if (!organizationId || !id) return;
    try {
      const result = object(
        await api.post(
          `/api/v1/organizations/${organizationId}/company/contracts/${id}/downpayment`,
          {},
          { "Idempotency-Key": crypto.randomUUID() },
        ),
      );
      if (typeof result.clientSecret === "string") {
        const stripe = await companyStripe;
        if (!stripe) throw new Error("Stripe browser configuration is unavailable.");
        const confirmation = await stripe.confirmPayment({
          clientSecret: result.clientSecret,
          redirect: "if_required",
          confirmParams: { return_url: location.href },
        });
        if (confirmation.error)
          throw new Error(confirmation.error.message ?? "Stripe confirmation failed.");
      }
      setMessage(
        "Downpayment submitted. Allocation remains locked while Stripe confirms settlement.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to submit downpayment.",
      );
    }
  }
  return (
    <Page
      title={id ? "Contract workspace" : "Contracts"}
      description="Private negotiation, matching approvals, manufacturer fulfillment, allocations, schedules, and immutable versions."
    >
      <Records
        state={state}
        detail={(row) => `/company/contracts/${String(row.id)}/overview`}
      />
      {Boolean(id && detail.employerDownpayment) && (
        <Alert
          tone={downpaymentStatus === "settled" ? "success" : "warning"}
          title="Employer downpayment status"
        >
          <p>
            {money(downpayment.requiredAmountCents)} required (
            {Number(downpayment.basisPoints ?? 0) / 100}% of the approved estimate).
            Status: {downpaymentStatus}. Robot allocation remains locked until Stripe
            confirms settlement.
          </p>
          {!["settled", "processing", "requires_action"].includes(
            downpaymentStatus,
          ) && (
            <Button onClick={() => void payDownpayment()}>
              Pay employer downpayment
            </Button>
          )}
          {downpaymentStatus === "requires_action" && (
            <p>
              Open the secure Stripe confirmation flow to complete any bank or card
              authorization. RoboWorkPool never treats client-side confirmation as
              settlement.
            </p>
          )}
        </Alert>
      )}
      {path.includes("messages") && (
        <Alert title="Group conversation">
          Messages require an explicit participant preview before sending.
        </Alert>
      )}
      {path.includes("allocations") && (
        <Alert title="Serial-number allocation">
          Manufacturer allocations must identify eligible robots and expose manufacturer
          serial numbers after assignment. The company cannot allocate owner robots
          itself.
        </Alert>
      )}
      {message && <p role="status">{message}</p>}
      <Help>
        Contracts create intended work and schedules, not payable time. Both parties
        approve the same version before activation; verified heartbeat time drives
        billing.
      </Help>
    </Page>
  );
}
function Operations({ path }: { path: string }) {
  const orgId = oid(),
    id = path.match(/(?:live-operations|assignments)\/([^/]+)/)?.[1],
    inactive = path.includes("inactive"),
    base = orgId ? `/api/v1/organizations/${orgId}` : undefined,
    endpoint = id
      ? `${base}/assignments/${id}${path.includes("live-operations") ? "/operational-status" : ""}`
      : base
        ? `${base}/assignments/operational-status`
        : undefined,
    state = useLoad(inactive ? undefined : endpoint),
    [message, setMessage] = useState("");
  async function report(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    const d = new FormData(e.currentTarget),
      assignmentId = formText(d, "assignmentId");
    await api.post(
      `/api/v1/organizations/${orgId}/assignments/${assignmentId}/report-inactive`,
      {
        robotId: d.get("robotId"),
        observedAt: d.get("observedAt"),
        reason: d.get("reason"),
        notes: d.get("notes"),
      },
    );
    setMessage("Inactive robot report submitted for review.");
  }
  return (
    <Page
      title={
        path.includes("verified-time")
          ? "Verified operating time"
          : path.includes("schedule")
            ? "Schedule"
            : inactive
              ? "Inactive robot report"
              : path.includes("replacement")
                ? "Replacement"
                : "Live operations"
      }
      description="Scheduled robots compared with backend-verified heartbeat evidence and serial identity."
    >
      {inactive ? (
        <>
          <Alert title="Serial confirmation required">
            Confirm the assignment, robot ID, and durable manufacturer serial before
            submitting.
          </Alert>
          <form
            className="company-form"
            onSubmit={(e) =>
              void report(e).catch((c) =>
                setMessage(c instanceof Error ? c.message : "Unable to report"),
              )
            }
          >
            <label>
              Assignment ID
              <input name="assignmentId" required />
            </label>
            <label>
              Robot ID
              <input name="robotId" required />
            </label>
            <label>
              Manufacturer serial confirmation
              <input name="serialConfirmation" required />
            </label>
            <label>
              Observed at
              <input name="observedAt" type="datetime-local" required />
            </label>
            <label>
              Reason
              <select name="reason">
                <option value="robot_not_present">Robot not present</option>
                <option value="robot_powered_off">Robot powered off</option>
                <option value="robot_not_moving">Robot not moving</option>
                <option value="robot_not_performing_assigned_work">
                  Not performing assigned work
                </option>
                <option value="wrong_robot">Wrong robot</option>
                <option value="fault_visible">Fault visible</option>
                <option value="emergency_stop">Emergency stop</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Notes
              <textarea name="notes" />
            </label>
            <Button>Submit inactive report</Button>
            {message && <p role="status">{message}</p>}
          </form>
        </>
      ) : (
        <Records state={state} />
      )}{" "}
      {path.includes("replacement") && (
        <Alert title="History is preserved">
          Replacement retains original assignment, robot serial, reason, approval,
          replacement serial, and transition timestamps.
        </Alert>
      )}
      <Help>
        Schedule alone creates no verified time or charge. Inactive reports are
        validated against the selected assignment and robot.
      </Help>
    </Page>
  );
}
function Finance({ path }: { path: string }) {
  const id = oid(),
    invoice = path.match(/\/invoices\/([^/]+)/)?.[1],
    resource = path.includes("invoices")
      ? `invoices${invoice ? `/${invoice}` : ""}`
      : path.includes("disputes")
        ? "financial-disputes"
        : path.includes("payments")
          ? "payment-attempts"
          : "billing/summary",
    state = useLoad(id ? `/api/v1/organizations/${id}/${resource}` : undefined);
  return (
    <Page
      title={
        path.includes("invoices")
          ? "Invoices"
          : path.includes("payments")
            ? "Payments"
            : path.includes("disputes")
              ? "Disputes"
              : "Billing"
      }
      description="Estimated, finalized, invoiced, submitted, processing, settled, and paid values remain distinct."
    >
      <Records state={state} />
      {path.endsWith("/pay") && (
        <Alert title="Payment confirmation required">
          Invoice payment uses the processor-backed, idempotent collection endpoint. The
          invoice must be refreshed before confirmation and an unknown outcome must be
          reconciled rather than retried blindly.
        </Alert>
      )}
      <Help>
        Invoices contain finalized charges for verified operating time. Estimated
        current-period charges are separate and are not invoices. Submitted never means
        settled or paid.
      </Help>
    </Page>
  );
}
function Reports() {
  return (
    <Page
      title="Company reports"
      description="Workforce, utilization, operations, training, contracts, manufacturers, and spending through governed reporting definitions."
    >
      <div className="company-grid">
        {[
          "workforce",
          "utilization",
          "operations",
          "training",
          "contracts",
          "spending",
        ].map((key) => (
          <article className="nr-card" key={key}>
            <h2>{key}</h2>
            <p>
              Source-supported measures only. Estimates, finalized charges, invoices,
              payments, and disputes remain separate.
            </p>
            <a href={`/reports?organizationId=${oid() ?? ""}&report=company_${key}`}>
              Configure report
            </a>
          </article>
        ))}
      </div>
      <Help>
        Reports reuse governed projections and cannot alter contracts, schedules,
        operation, training access, or financial records.
      </Help>
    </Page>
  );
}
function Administration({ path }: { path: string }) {
  const title = path.endsWith("notifications")
      ? "Notifications"
      : path.endsWith("team")
        ? "Team and permissions"
        : path.endsWith("support")
          ? "Company support"
          : "Company settings",
    state = useLoad(
      path.endsWith("notifications") && oid()
        ? `/api/v1/organizations/${oid()}/notifications`
        : undefined,
    );
  return (
    <Page
      title={title}
      description="Company administration using organization-scoped permissions."
    >
      {path.endsWith("notifications") ? (
        <Records
          state={state}
          detail={(row) =>
            typeof row.href === "string" ? row.href : "/company/notifications"
          }
        />
      ) : path.endsWith("team") ? (
        <section className="nr-card">
          <h2>Permission areas</h2>
          <p>
            Facilities, jobs, training, messaging, contracts, schedules, invoices,
            disputes, reports, and team management use explicit server-side permissions.
          </p>
          <a href="/account/organizations">Review organization membership</a>
        </section>
      ) : (
        <a href="/support">Contact Nation Reserve support</a>
      )}
      <Help>Frontend visibility never replaces server authorization.</Help>
    </Page>
  );
}
export function CompanyPage({ path }: { path: string }) {
  if (
    path === "/company" ||
    path === "/company/dashboard" ||
    path === "/company/action-center"
  )
    return <Dashboard />;
  if (path.includes("get-started") || path.includes("onboarding"))
    return <Onboarding />;
  if (path.includes("/work-areas")) return <WorkArea path={path} />;
  for (const kind of ["facilities", "departments", "workforce-plans", "jobs"] as const)
    if (path === `/company/${kind}` || path.startsWith(`/company/${kind}/`))
      return kind === "jobs" &&
        /(responsibilities|requirements|safety|training)$/.test(path) ? (
        <JobBuilder path={path} />
      ) : (
        <StructuredResource kind={kind} path={path} />
      );
  if (path.startsWith("/company/training")) return <Training path={path} />;
  if (path.startsWith("/company/work-orders")) return <CompanyWorkOrders path={path} />;
  if (
    path.startsWith("/company/manufacturers") ||
    path.startsWith("/company/opportunities") ||
    path.startsWith("/company/conversations")
  )
    return <Sourcing path={path} />;
  if (path.startsWith("/company/contracts")) return <Contracts path={path} />;
  if (
    path.startsWith("/company/assignments") ||
    path.startsWith("/company/schedule") ||
    path.startsWith("/company/live-operations") ||
    path.startsWith("/company/inactive-reports") ||
    path.startsWith("/company/replacements") ||
    path.startsWith("/company/verified-time")
  )
    return <Operations path={path} />;
  if (
    path.startsWith("/company/billing") ||
    path.startsWith("/company/invoices") ||
    path.startsWith("/company/payments") ||
    path.startsWith("/company/disputes")
  )
    return <Finance path={path} />;
  if (path.startsWith("/company/reports")) return <Reports />;
  return <Administration path={path} />;
}
export function CompanyPortalApp() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);
  return (
    <OrganizationProvider initial={developmentSessions.company!}>
      <AuthenticatedShell
        breadcrumbs={[
          { label: "RoboWorkPool", href: "/" },
          { label: "Hiring Company", href: "/company" },
          { label: "Current page" },
        ]}
      >
        <CompanyPage path={path} />
      </AuthenticatedShell>
    </OrganizationProvider>
  );
}
