import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  FormField,
  PageHeader,
  StatusBadge,
} from "@nation-reserve/design-system";
import {
  AuthenticatedShell,
  developmentSessions,
  OrganizationProvider,
} from "@nation-reserve/application-shell";
import { api } from "./auth-client.js";

type Row = Record<string, unknown>;
type State = { loading: boolean; data?: unknown; error?: string };
const org = () =>
  sessionStorage.getItem("nr-active-organization") ??
  sessionStorage.getItem("currentOrganizationId");
const object = (v: unknown): Row => (v && typeof v === "object" ? (v as Row) : {});
const list = (v: unknown): Row[] =>
  Array.isArray(v)
    ? v.filter((x): x is Row => !!x && typeof x === "object")
    : Array.isArray(object(v).items)
      ? (object(v).items as Row[])
      : [];
const label = (v: unknown, fallback = "Not available") =>
  typeof v === "string" && v ? v : fallback;
const scalar = (v: unknown) =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    ? String(v)
    : "—";
const amount = (v: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0) / 100,
  );
function useData(path?: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State>({ loading: !!path });
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
  }, [path, revision]);
  return {
    ...state,
    retry: () => {
      setState({ loading: true });
      setRevision((v) => v + 1);
    },
  };
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
    <section className="owner-page">
      <PageHeader eyebrow="Robot Owner" title={title} description={description} />
      {children}
    </section>
  );
}
function Help({ children }: { children: ReactNode }) {
  return (
    <aside className="owner-help">
      <h2>What this page is about</h2>
      <p>{children}</p>
    </aside>
  );
}
function Gap({ title, children }: { title: string; children: ReactNode }) {
  return <Alert title={title}>{children}</Alert>;
}
function Metric({
  name,
  value,
  help,
}: {
  name: string;
  value: ReactNode;
  help: string;
}) {
  return (
    <article className="owner-metric">
      <span>{name}</span>
      <strong>{value}</strong>
      <small>{help}</small>
    </article>
  );
}
function Records({
  state,
  detail,
}: {
  state: State;
  detail?: ((row: Row) => string) | undefined;
}) {
  if (state.loading) return <p role="status">Loading…</p>;
  if (state.error) return <ErrorState description={state.error} />;
  const records = list(state.data);
  if (!records.length && state.data && Object.keys(object(state.data)).length)
    records.push(object(state.data));
  if (!records.length)
    return (
      <EmptyState
        title="No records yet"
        description="No eligible records were returned for the active organization."
      />
    );
  return (
    <div className="owner-records">
      {records.map((row, i) => (
        <article className="nr-card" key={label(row.id, String(i))}>
          <StatusBadge status="general.active" />
          <h2>
            {label(
              row.name ?? row.statement_number ?? row.serial_number ?? row.id,
              "Record",
            )}
          </h2>
          <dl>
            {Object.entries(row)
              .slice(0, 8)
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll("_", " ")}</dt>
                  <dd>
                    {typeof value === "object" ? "Available in detail" : scalar(value)}
                  </dd>
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
  const id = org(),
    state = useData(id ? `/api/v1/organizations/${id}/owner/dashboard` : undefined),
    earnings = useData(id ? `/api/v1/organizations/${id}/earnings/summary` : undefined),
    v = object(state.data),
    robots = object(v.robots),
    time = object(v.operatingTime),
    money = object(earnings.data);
  return (
    <Page
      title="Robot Owner dashboard"
      description="Robots, verified operation, queue position, earnings readiness, and actions that need attention."
    >
      <Alert title="Own robots. Put them to work. Earn from verified uptime.">
        <p>
          Eligible owners can earn the configured base rate—currently $5 per verified
          operating hour per robot—when an owned robot performs authorized work. Each
          verified owner may own a maximum of 20 robots across related accounts.
        </p>
        <a href="/account/verification">Complete identity verification</a>
      </Alert>
      {!id && (
        <Gap title="Choose an organization">
          Select a Robot Owner organization to load organization-scoped information.
        </Gap>
      )}
      <div className="owner-metrics">
        <Metric
          name="Robots owned"
          value={scalar(robots.total)}
          help="Currently verified ownership records."
        />
        <Metric
          name="Activated"
          value={scalar(robots.activated)}
          help="Robots that completed activation."
        />
        <Metric
          name="Assigned"
          value={scalar(robots.assigned)}
          help="Robots connected to an assignment."
        />
        <Metric
          name="Operating now"
          value={scalar(robots.operating)}
          help="Robots with current online operating evidence."
        />
        <Metric
          name="Queue position"
          value={scalar(object(v.queue).position)}
          help="Chronological active downpayment position."
        />
        <Metric
          name="Verified today"
          value={`${scalar(time.today_seconds)} sec`}
          help="Finalized verified operating time today."
        />
        <Metric
          name="Today's earnings"
          value={earnings.loading ? "…" : amount(money.today_minor_units)}
          help="Gross verified earnings today."
        />
        <Metric
          name="Financially ready"
          value={amount(money.financially_ready_minor_units)}
          help="Processed, but not necessarily payable."
        />
        <Metric
          name="Ready for payout"
          value={amount(money.ready_for_payout_minor_units)}
          help="Eligible for payout processing."
        />
      </div>
      <div className="owner-grid">
        <article className="nr-card">
          <h2>Required actions</h2>
          <ul>
            <li>
              <a href="/owner/payouts/setup">Finish payout setup</a>
            </li>
            <li>
              <a href="/owner/ownership">Review ownership claims</a>
            </li>
            <li>
              <a href="/owner/earnings/holds">Review holds</a>
            </li>
          </ul>
        </article>
        <article className="nr-card">
          <h2>Recent notifications</h2>
          <p>{scalar(v.unreadNotifications)} unread notifications.</p>
          <a href="/owner/notifications">Review notifications</a>
        </article>
      </div>
      <Help>
        Metrics are permission-scoped projections of authoritative records. A dash means
        no value was supplied; it never means zero.
      </Help>
    </Page>
  );
}
function Robots() {
  const id = org(),
    [search, setSearch] = useState(""),
    state = useData(
      id
        ? `/api/v1/organizations/${id}/owner/robots${search ? `?search=${encodeURIComponent(search)}` : ""}`
        : undefined,
    );
  return (
    <Page
      title="Robots"
      description="The central inventory for robots owned by the active organization."
    >
      <div className="owner-toolbar">
        <input
          aria-label="Search by serial number"
          placeholder="Search serial number, model, or manufacturer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Manufacturer">
          <option>All manufacturers</option>
        </select>
        <select aria-label="Model">
          <option>All models</option>
        </select>
        <select aria-label="Status">
          <option>All statuses</option>
        </select>
        <select aria-label="Availability">
          <option>Any availability</option>
        </select>
        <select aria-label="Assignment">
          <option>Any assignment</option>
        </select>
      </div>
      <Records state={state} detail={(row) => `/owner/robots/${String(row.id)}`} />
      <a href="/owner/robots/new">Claim a robot</a>
      <Help>
        Ownership, activation, availability, assignment, operating state, and last
        heartbeat remain independently visible.
      </Help>
    </Page>
  );
}
function Robot({ id }: { id: string }) {
  const oid = org(),
    robot = useData(`/api/v1/robots/${id}`),
    time = useData(
      oid ? `/api/v1/organizations/${oid}/robots/${id}/operating-time` : undefined,
    ),
    [message, setMessage] = useState("");
  async function availability(available: boolean) {
    if (!oid) return;
    const row = object(robot.data),
      version = Number(row.stateVersion ?? row.state_version);
    if (!Number.isInteger(version) || version < 1) {
      setMessage("Refresh the robot record before changing availability.");
      return;
    }
    await api.patch(`/api/v1/organizations/${oid}/owner/robots/${id}/availability`, {
      available,
      expectedVersion: version,
    });
    setMessage(available ? "Robot marked available." : "Robot marked unavailable.");
    robot.retry();
  }
  return (
    <Page
      title="Robot details"
      description="Identity, lifecycle, assignment, availability, and verified operation for one robot."
    >
      <Records state={robot} />
      <div className="public-actions">
        <Button
          onClick={() =>
            void availability(true).catch((c) =>
              setMessage(c instanceof Error ? c.message : "Unable to update"),
            )
          }
        >
          Mark available
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            void availability(false).catch((c) =>
              setMessage(c instanceof Error ? c.message : "Unable to update"),
            )
          }
        >
          Mark unavailable
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
      <h2>Operating-time history</h2>
      <Records
        state={time}
        detail={(row) => `/owner/operating-time/${String(row.id)}`}
      />
      <Help>
        Availability changes are rejected during an active assignment and use optimistic
        locking to prevent stale updates.
      </Help>
    </Page>
  );
}
function Claim() {
  const [msg, setMsg] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      robotId = d.get("robotId"),
      transferCode = d.get("transferCode");
    if (typeof robotId !== "string" || typeof transferCode !== "string") return;
    try {
      await api.post(`/api/v1/owner/robots/${robotId}/claim`, { transferCode });
      setMsg("Ownership claim submitted for verification.");
    } catch (c) {
      setMsg(c instanceof Error ? c.message : "Claim submission failed.");
    }
  }
  return (
    <Page
      title="Claim robot ownership"
      description="Connect an eligible registered robot to your organization."
    >
      <Alert title="20-robot ownership limit">
        <p>
          The maximum is 20 robots per verified owner across related accounts.
          RoboWorkPool uses verified identity relationships—not email alone—to make
          duplicate-account circumvention harder.
        </p>
      </Alert>
      <ol className="owner-steps">
        <li>Enter the platform robot ID and manufacturer transfer code.</li>
        <li>Review identity before submission.</li>
        <li>Nation Reserve verifies the ownership evidence.</li>
        <li>If rejected, review the reason and contact support if needed.</li>
      </ol>
      <form className="account-form" onSubmit={(e) => void submit(e)}>
        <FormField label="Robot platform ID" required>
          <input required name="robotId" aria-label="Robot platform ID" />
        </FormField>
        <FormField label="Transfer code" required>
          <input
            required
            name="transferCode"
            aria-label="Transfer code"
            autoComplete="off"
          />
        </FormField>
        <Button type="submit">Submit ownership claim</Button>
        {msg && <p role="status">{msg}</p>}
      </form>
      <Help>
        Submission is not approval, activation, assignment, or earnings eligibility.
        Verification prevents ownership from being attached to the wrong organization.
      </Help>
    </Page>
  );
}
function Ownership({ claimId }: { claimId?: string | undefined }) {
  const oid = org(),
    state = useData(
      oid
        ? `/api/v1/organizations/${oid}/owner/claims${claimId ? `/${claimId}` : ""}`
        : undefined,
    );
  return (
    <Page
      title={claimId ? "Ownership claim" : "Ownership verification"}
      description="Track ownership evidence and review outcomes."
    >
      <Records state={state} detail={(row) => `/owner/ownership/${String(row.id)}`} />
      {!claimId && <a href="/owner/robots/new">Start a new claim</a>}
      <Help>
        Ownership status records whether Nation Reserve verified the submitted evidence.
        Rejection never erases immutable history.
      </Help>
    </Page>
  );
}
function Assignments({ id }: { id?: string | undefined }) {
  const oid = org(),
    state = useData(
      oid
        ? `/api/v1/organizations/${oid}/owner/assignments${id ? `/${id}` : ""}`
        : undefined,
    );
  return (
    <Page
      title={id ? "Assignment details" : "Assignments"}
      description="Read-only assignment visibility for owned robots."
    >
      <Records state={state} detail={(row) => `/owner/assignments/${String(row.id)}`} />
      <Help>
        Owners can review company, manufacturer, facility, department, dates, status,
        and verified operation. Owners cannot edit assignments.
      </Help>
    </Page>
  );
}
function Operating({ id }: { id?: string | undefined }) {
  const oid = org(),
    state = useData(
      oid
        ? `/api/v1/organizations/${oid}/owner/operating-time${id ? `/${id}` : ""}`
        : undefined,
    ),
    data = object(state.data),
    totals = object(data.totals);
  return (
    <Page
      title={id ? "Verified operating interval" : "Operating time"}
      description="Scheduled time and heartbeat-verified operating time shown separately."
    >
      {!id && (
        <>
          <div className="owner-metrics">
            <Metric
              name="Today"
              value={`${scalar(totals.todaySeconds)} sec`}
              help="Verified time today."
            />
            <Metric
              name="Week"
              value={`${scalar(totals.weekSeconds)} sec`}
              help="Verified time this week."
            />
            <Metric
              name="Month"
              value={`${scalar(totals.monthSeconds)} sec`}
              help="Verified time this month."
            />
            <Metric
              name="Lifetime"
              value={`${scalar(totals.lifetimeSeconds)} sec`}
              help="All verified time."
            />
          </div>
          <div
            className="time-comparison"
            role="img"
            aria-label="Scheduled time is separate from verified operating time"
          >
            <span>Scheduled</span>
            <span aria-hidden="true">→</span>
            <strong>Verified</strong>
          </div>
        </>
      )}
      <Records
        state={state}
        detail={(row) => `/owner/operating-time/${String(row.id)}`}
      />
      <Help>
        Earnings use signed heartbeat evidence and eligible assignment context, not
        simply scheduled time.
      </Help>
    </Page>
  );
}
const finance = (kind: string, id?: string) => {
  const oid = org();
  return oid
    ? `/api/v1/organizations/${oid}/earnings/${kind}${id ? `/${id}` : ""}`
    : undefined;
};
function Earnings({
  kind = "summary",
  id,
}: {
  kind?: "summary" | "statements" | "holds" | "disputes";
  id?: string | undefined;
}) {
  const state = useData(finance(kind, id)),
    v = object(state.data),
    title = id ? "Statement details" : kind[0]!.toUpperCase() + kind.slice(1);
  return (
    <Page
      title={title}
      description="Backend-calculated financial records; the browser does not recalculate ledger values."
    >
      {kind === "summary" && (
        <div className="owner-metrics">
          <Metric
            name="Today"
            value={amount(v.today_minor_units)}
            help="Gross verified earnings today."
          />
          <Metric
            name="Week"
            value={amount(v.week_minor_units)}
            help="Gross verified earnings this week."
          />
          <Metric
            name="Month"
            value={amount(v.month_minor_units)}
            help="Gross verified earnings this month."
          />
          <Metric
            name="Lifetime"
            value={amount(v.lifetime_minor_units)}
            help="All gross verified earnings."
          />
          <Metric
            name="Financially ready"
            value={amount(v.financially_ready_minor_units)}
            help="Processed, not necessarily payable."
          />
          <Metric
            name="Held"
            value={amount(v.held_minor_units)}
            help="Temporarily excluded from progression."
          />
          <Metric
            name="Ready for payout"
            value={amount(v.ready_for_payout_minor_units)}
            help="Eligible for payout processing."
          />
        </div>
      )}
      <Records
        state={state}
        detail={
          kind === "statements"
            ? (row) => `/owner/earnings/statements/${String(row.id)}`
            : undefined
        }
      />
      {kind === "disputes" && (
        <a href="/support">Contact support about an earnings dispute</a>
      )}
      <Help>
        {kind === "statements"
          ? "Statements summarize verified earnings, fees, net amounts, adjustments, holds, and disputes for a period. Statements are not payouts."
          : kind === "holds"
            ? "A hold temporarily prevents an amount from progressing. Its reason, reviewer, history, and next step should be understandable without technical language."
            : kind === "disputes"
              ? "Disputes preserve the questioned amount, evidence, review, and outcome without rewriting historical ledger entries."
              : "Financially Ready, Ready for Payout, Payout Submitted, and Paid are distinct financial states."}
      </Help>
    </Page>
  );
}
function Payouts({ mode = "overview" }: { mode?: "overview" | "setup" | "history" }) {
  const oid = org(),
    account = useData(
      oid ? `/api/v1/organizations/${oid}/earnings/payout-account` : undefined,
    ),
    history = useData(
      oid && mode === "history"
        ? `/api/v1/organizations/${oid}/payout-attempts`
        : undefined,
    ),
    [open, setOpen] = useState(false),
    [msg, setMsg] = useState("");
  async function begin() {
    if (!oid) return;
    try {
      const result = object(
        await api.post(
          `/api/v1/organizations/${oid}/earnings/payout-account/onboarding-link`,
          {},
        ),
      );
      if (typeof result.url === "string" && result.url.startsWith("https://"))
        location.assign(result.url);
      else setMsg("No safe onboarding destination was returned.");
    } catch (c) {
      setMsg(c instanceof Error ? c.message : "Unable to begin onboarding.");
    }
    setOpen(false);
  }
  return (
    <Page
      title={
        mode === "setup"
          ? "Payout setup"
          : mode === "history"
            ? "Payout history"
            : "Payouts"
      }
      description="Payout readiness and transfers of eligible earnings."
    >
      <Records state={mode === "history" ? history : account} />
      {mode === "setup" && (
        <>
          <Alert title="20-robot ownership limit">
            <p>
              The maximum is 20 robots per verified owner across related accounts.
              RoboWorkPool uses verified identity relationships—not email alone—to make
              duplicate-account circumvention harder.
            </p>
          </Alert>
          <ol className="owner-steps">
            <li>Open the approved processor’s secure onboarding.</li>
            <li>Provide required payout and identity information there.</li>
            <li>Return and refresh payout readiness.</li>
            <li>Eligible earnings proceed only after required checks pass.</li>
          </ol>
          <Button onClick={() => setOpen(true)}>Begin secure payout setup</Button>
        </>
      )}
      {msg && <p role="status">{msg}</p>}
      <Dialog
        open={open}
        title="Continue to secure payout setup?"
        onClose={() => setOpen(false)}
      >
        <p>
          You may leave RoboWorkPool for the approved payment processor. Do not enter
          bank credentials directly on this page.
        </p>
        <Button onClick={() => void begin()}>Continue securely</Button>
      </Dialog>
      <Help>
        Payouts transfer eligible earnings after processing completes. Financially Ready
        does not mean Paid.
      </Help>
    </Page>
  );
}
function Reports() {
  const oid = org();
  return (
    <Page
      title="Reports"
      description="Generate governed, permission-scoped owner reports."
    >
      <div className="owner-grid">
        {[
          ["Earnings report", "owner_earnings"],
          ["Operating-time report", "owner_operating_time"],
          ["Robot utilization report", "owner_robot_utilization"],
        ].map(([name, key]) => (
          <article className="nr-card" key={key}>
            <h2>{name}</h2>
            <p>Use shared filters, exports, saved views, and schedules.</p>
            <a href={`/reports?organizationId=${oid ?? ""}&report=${key}`}>
              Configure report
            </a>
          </article>
        ))}
      </div>
      <Help>
        Reports reuse the reporting infrastructure and governed definitions. They do not
        calculate earnings or operating time in the browser.
      </Help>
    </Page>
  );
}
function Notifications() {
  const oid = org(),
    state = useData(oid ? `/api/v1/organizations/${oid}/notifications` : undefined);
  return (
    <Page
      title="Notifications"
      description="Owner events with safe deep-link destinations."
    >
      <Records
        state={state}
        detail={(row) =>
          typeof row.href === "string" ? row.href : "/owner/notifications"
        }
      />
      <details>
        <summary>Notification destinations</summary>
        <ul className="notification-links">
          <li>
            <a href="/owner/ownership">Ownership approved</a>
          </li>
          <li>
            <a href="/owner/robots">Robot activated</a>
          </li>
          <li>
            <a href="/owner/assignments">Robot assigned</a>
          </li>
          <li>
            <a href="/owner/payouts/history">Payout completed</a>
          </li>
          <li>
            <a href="/owner/earnings/holds">Hold placed</a>
          </li>
        </ul>
      </details>
      <Help>
        Notifications describe a change and link to its authoritative record. They never
        change robot or financial state themselves.
      </Help>
    </Page>
  );
}
function Settings() {
  return (
    <Page
      title="Robot Owner settings"
      description="Organization settings and shared Nation Reserve account controls."
    >
      <div className="owner-grid">
        <article className="nr-card">
          <h2>Organization</h2>
          <a href="/account/organizations">Manage organization context</a>
        </article>
        <article className="nr-card">
          <h2>Security</h2>
          <a href="/account/security">Manage account security</a>
        </article>
        <article className="nr-card">
          <h2>Help and support</h2>
          <a href="/support">Contact support</a>
        </article>
      </div>
      <Help>
        Organization settings affect this Robot Owner organization. Profile, security,
        sessions, and preferences belong to the shared Nation Reserve account.
      </Help>
    </Page>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function isOwnerRoute(path: string) {
  return path === "/owner" || path.startsWith("/owner/");
}
export function OwnerPage({ path }: { path: string }) {
  if (path === "/owner" || path === "/owner/dashboard") return <Dashboard />;
  if (path === "/owner/robots/new") return <Claim />;
  const robot = path.match(/^\/owner\/robots\/([^/]+)$/);
  if (robot) return <Robot id={robot[1]!} />;
  if (path === "/owner/robots") return <Robots />;
  const claim = path.match(/^\/owner\/ownership\/([^/]+)$/);
  if (claim) return <Ownership claimId={claim[1]} />;
  if (path === "/owner/ownership") return <Ownership />;
  const assignment = path.match(/^\/owner\/assignments\/([^/]+)$/);
  if (assignment) return <Assignments id={assignment[1]} />;
  if (path === "/owner/assignments") return <Assignments />;
  const interval = path.match(/^\/owner\/operating-time\/([^/]+)$/);
  if (interval) return <Operating id={interval[1]} />;
  if (path === "/owner/operating-time") return <Operating />;
  const statement = path.match(/^\/owner\/earnings\/statements\/([^/]+)$/);
  if (statement) return <Earnings kind="statements" id={statement[1]} />;
  if (path === "/owner/earnings/statements") return <Earnings kind="statements" />;
  if (path === "/owner/earnings/holds") return <Earnings kind="holds" />;
  if (path === "/owner/earnings/disputes") return <Earnings kind="disputes" />;
  if (path === "/owner/earnings") return <Earnings />;
  if (path === "/owner/payouts/setup") return <Payouts mode="setup" />;
  if (path === "/owner/payouts/history") return <Payouts mode="history" />;
  if (path === "/owner/payouts") return <Payouts />;
  if (path === "/owner/reports") return <Reports />;
  if (path === "/owner/notifications") return <Notifications />;
  return <Settings />;
}
export function OwnerPortalApp() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);
  return (
    <OrganizationProvider initial={developmentSessions.owner!}>
      <AuthenticatedShell
        breadcrumbs={[
          { label: "RoboWorkPool", href: "/" },
          { label: "Robot Owner", href: "/owner" },
          { label: "Current page" },
        ]}
      >
        <OwnerPage path={path} />
      </AuthenticatedShell>
    </OrganizationProvider>
  );
}
