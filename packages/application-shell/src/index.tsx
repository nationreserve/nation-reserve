import {
  Component,
  createContext,
  useContext,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  Alert,
  Button,
  Dialog,
  PageHeader,
  setTheme,
} from "@nation-reserve/design-system";

export type OrganizationType =
  "robot_owner" | "hiring_company" | "manufacturer" | "platform";
export interface Membership {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  role: string;
  status: string;
  permissions: string[];
}
export interface SessionContext {
  user: { id: string; name: string; email: string };
  memberships: Membership[];
  currentOrganization: Membership | null;
  environment: "development" | "test" | "staging" | "production";
  featureFlags: Record<string, boolean>;
  maintenance: string[];
  unreadNotifications: number;
}
export interface OrganizationContextValue extends SessionContext {
  switchOrganization: (organizationId: string) => void;
  cacheEpoch: number;
}
const OrganizationContext = createContext<OrganizationContextValue | null>(null);
export function OrganizationProvider({
  initial,
  onSwitch,
  children,
}: {
  initial: SessionContext;
  onSwitch?: (id: string) => Promise<void> | void;
  children: ReactNode;
}) {
  const [session, setSession] = useState(initial);
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const switchOrganization = (id: string) => {
    const next = session.memberships.find((m) => m.organizationId === id);
    if (!next) return;
    void Promise.resolve(onSwitch?.(id)).then(() => {
      setSession((s) => ({ ...s, currentOrganization: next }));
      setCacheEpoch((v) => v + 1);
      sessionStorage.setItem("nr-active-organization", id);
    });
  };
  return (
    <OrganizationContext.Provider
      value={{ ...session, switchOrganization, cacheEpoch }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}
export function useOrganization() {
  const value = useContext(OrganizationContext);
  if (!value)
    throw new Error("useOrganization must be used within OrganizationProvider");
  return value;
}
export function organizationCacheKey(
  context: Pick<
    OrganizationContextValue,
    "user" | "currentOrganization" | "environment" | "cacheEpoch"
  >,
  resource: string,
  filters = "",
) {
  return [
    context.user.id,
    context.currentOrganization?.organizationId ?? "none",
    context.environment,
    context.cacheEpoch,
    resource,
    filters,
  ] as const;
}
export interface NavigationItem {
  key: string;
  label: string;
  route: string;
  organizationTypes: OrganizationType[];
  requiredPermissions: string[];
  featureFlag?: string;
  maintenanceSubsystem?: string;
  order: number;
  children?: NavigationItem[];
}
const portalBase: Record<OrganizationType, string> = {
  robot_owner: "/owner",
  hiring_company: "/company",
  manufacturer: "/manufacturer",
  platform: "/platform",
};
const canonicalPortalRoutes: Record<string, string> = {
  "robot_owner:Overview": "/owner",
  "robot_owner:Statements": "/owner/earnings/statements",
  "robot_owner:Disputes": "/owner/earnings/disputes",
  "robot_owner:Organization Settings": "/owner/settings",
  "robot_owner:Support": "/support",
  "robot_owner:Down-Payment Queue": "/downpayment-queue",
  "hiring_company:Overview": "/company",
  "hiring_company:Workforce Planning": "/company/workforce-plans",
  "hiring_company:Manufacturers": "/company/manufacturers",
  "hiring_company:Conversations": "/company/conversations",
  "hiring_company:Organization Settings": "/company/settings",
  "hiring_company:Support": "/support",
  "hiring_company:Down-Payment Queue": "/downpayment-queue",
  "manufacturer:Overview": "/manufacturer",
  "manufacturer:Applications": "/manufacturer/application",
  "manufacturer:Contract Fulfillment": "/manufacturer/fulfillment",
  "manufacturer:Conversations": "/manufacturer/conversations",
  "manufacturer:Organization Settings": "/manufacturer/settings",
  "manufacturer:Support": "/support",
  "manufacturer:Down-Payment Queue": "/downpayment-queue",
  "platform:Operations Overview": "/platform",
};
const common = (type: OrganizationType, labels: string[]): NavigationItem[] =>
  labels.map((label, order) => ({
    key: `${type}-${label.toLowerCase().replaceAll(" ", "-")}`,
    label,
    route:
      canonicalPortalRoutes[`${type}:${label}`] ??
      `${portalBase[type]}/${label.toLowerCase().replaceAll(" ", "-")}`,
    organizationTypes: [type],
    requiredPermissions: [],
    order,
  }));
export const navigationRegistry: NavigationItem[] = [
  ...common("robot_owner", [
    "Overview",
    "Robots",
    "Assignments",
    "Operating Time",
    "Earnings",
    "Statements",
    "Payouts",
    "Disputes",
    "Reports",
    "Notifications",
    "Organization Settings",
    "Support",
  ]),
  ...common("hiring_company", [
    "Overview",
    "Workforce Planning",
    "Manufacturers",
    "Conversations",
    "Contracts",
    "Facilities",
    "Departments",
    "Assignments",
    "Live Operations",
    "Inactive Reports",
    "Replacements",
    "Verified Time",
    "Invoices",
    "Payments",
    "Disputes",
    "Reports",
    "Notifications",
    "Organization Settings",
    "Support",
  ]),
  ...common("manufacturer", [
    "Overview",
    "Applications",
    "Integration",
    "API Credentials",
    "Robot Models",
    "Robots",
    "Ownership Transfers",
    "Activations",
    "Contract Fulfillment",
    "Conversations",
    "Allocations",
    "Replacements",
    "Fleet Health",
    "API Logs",
    "Documentation",
    "Notifications",
    "Organization Settings",
    "Support",
  ]),
  ...common("platform", [
    "Operations Overview",
    "Organizations",
    "Users",
    "Manufacturers",
    "Robots",
    "Contracts",
    "Assignments",
    "Heartbeat Operations",
    "Fraud Review",
    "Financial Operations",
    "Invoices",
    "Owner Earnings",
    "Payments",
    "Payouts",
    "Settlement",
    "Reconciliation",
    "Disputes",
    "Holds",
    "Adjustments",
    "Jobs",
    "Health",
    "Incidents",
    "Maintenance",
    "Announcements",
    "Feature Flags",
    "Configuration",
    "Audit",
    "Reports",
    "Specification",
    "Security",
    "Support",
  ]).map((item) => ({
    ...item,
    requiredPermissions: [
      `platform:${item.label.toLowerCase().replaceAll(" ", "_")}:read`,
    ],
  })),
];
export function visibleNavigation(items: NavigationItem[], context: SessionContext) {
  const org = context.currentOrganization;
  if (!org) return [];
  return items
    .filter(
      (item) =>
        item.organizationTypes.includes(org.organizationType) &&
        item.requiredPermissions.every(
          (p) => org.permissions.includes(p) || org.permissions.includes("platform:*"),
        ) &&
        (!item.featureFlag || context.featureFlags[item.featureFlag] === true) &&
        (!item.maintenanceSubsystem ||
          !context.maintenance.includes(item.maintenanceSubsystem)),
    )
    .sort((a, b) => a.order - b.order);
}
export type GuardRequirement = {
  authenticated?: boolean;
  organizationTypes?: OrganizationType[];
  permission?: string;
  featureFlag?: string;
  maintenanceSubsystem?: string;
  onboardingComplete?: boolean;
  stepUp?: boolean;
};
export type GuardOutcome =
  | "allow"
  | "login"
  | "organization_required"
  | "restricted"
  | "feature_unavailable"
  | "maintenance"
  | "onboarding_required"
  | "step_up_required";
export function evaluateRouteGuard(
  context: SessionContext | null,
  requirement: GuardRequirement,
): GuardOutcome {
  if (requirement.authenticated && !context) return "login";
  if (!context) return "allow";
  const org = context.currentOrganization;
  if ((requirement.organizationTypes || requirement.permission) && !org)
    return "organization_required";
  if (
    requirement.organizationTypes &&
    org &&
    !requirement.organizationTypes.includes(org.organizationType)
  )
    return "restricted";
  if (
    requirement.permission &&
    org &&
    !org.permissions.includes(requirement.permission) &&
    !org.permissions.includes("platform:*")
  )
    return "restricted";
  if (requirement.featureFlag && !context.featureFlags[requirement.featureFlag])
    return "feature_unavailable";
  if (
    requirement.maintenanceSubsystem &&
    context.maintenance.includes(requirement.maintenanceSubsystem)
  )
    return "maintenance";
  if (requirement.onboardingComplete && org?.status === "onboarding")
    return "onboarding_required";
  if (requirement.stepUp) return "step_up_required";
  return "allow";
}
export function SkipLinks() {
  return (
    <nav aria-label="Skip links" className="nr-skip-links">
      <a href="#main-content">Skip to main content</a>
      <a href="#primary-navigation">Skip to navigation</a>
      <a href="#page-actions">Skip to page actions</a>
    </nav>
  );
}
const Brand = ({ platform = false }: { platform?: boolean }) => (
  <a className="nr-brand" href="/">
    <span>Nation Reserve</span>
    <strong>
      {platform ? "RoboWorkPool · Platform Administration" : "RoboWorkPool"}
    </strong>
  </a>
);
export function AnnouncementBanner({
  title,
  children,
  dismissible = false,
}: {
  title: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const [shown, setShown] = useState(true);
  if (!shown) return null;
  return (
    <div className="nr-announcement" role="status">
      <strong>{title}</strong>
      <span>{children}</span>
      {dismissible && (
        <Button
          variant="quiet"
          onClick={() => setShown(false)}
          aria-label="Dismiss announcement"
        >
          ×
        </Button>
      )}
    </div>
  );
}
export function PublicShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SkipLinks />
      <header className="nr-public-header">
        <Brand />
        <Button
          variant="quiet"
          className="nr-mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Menu
        </Button>
        <nav
          id="primary-navigation"
          aria-label="Product navigation"
          className={open ? "is-open" : ""}
        >
          <a href="/roboworkpool">RoboWorkPool</a>
          <a href="/roboworkpool/how-it-works">How it works</a>
          <a href="/roboworkpool/hiring-companies">Hire robots</a>
          <a href="/roboworkpool/robot-owners">Own robots</a>
          <a href="/roboworkpool/manufacturers">Manufacturers</a>
          <a href="/roboworkpool/pricing">Pricing</a>
          <a href="/about">About</a>
        </nav>
        <div className="nr-public-actions">
          <a href="/login">Log in</a>
          <a className="nr-button nr-button--primary" href="/register">
            Get started
          </a>
        </div>
      </header>
      <main id="main-content" className="nr-public-main">
        {children}
      </main>
      <footer className="nr-public-footer">
        <div>
          <Brand />
          <p>Verified infrastructure for accountable participation.</p>
        </div>
        <div className="nr-footer-groups">
          <nav aria-label="Product footer">
            <strong>Product</strong>
            <a href="/roboworkpool/how-it-works">How it works</a>
            <a href="/roboworkpool/hiring-companies">Hire robots</a>
            <a href="/roboworkpool/robot-owners">Own robots</a>
            <a href="/roboworkpool/manufacturers">Manufacturers</a>
            <a href="/roboworkpool/heartbeat-api">Heartbeat API</a>
          </nav>
          <nav aria-label="Company footer">
            <strong>Company</strong>
            <a href="/about">About Nation Reserve</a>
            <a href="/contact">Contact</a>
          </nav>
          <nav aria-label="Resources footer">
            <strong>Resources</strong>
            <a href="/roboworkpool/faq">FAQ</a>
            <a href="/support">Support</a>
            <a href="/status">Status</a>
            <a href="/roboworkpool/trust-and-verification">Trust and verification</a>
          </nav>
          <nav aria-label="Legal footer">
            <strong>Legal</strong>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/legal/cookies">Cookies</a>
            <a href="/legal/acceptable-use">Acceptable use</a>
            <a href="/legal/manufacturer-api-terms">Manufacturer API terms</a>
            <a href="/accessibility">Accessibility</a>
          </nav>
        </div>
        <small>
          © 2026 Nation Reserve. Final legal entity and business contact details await
          publication approval.
        </small>
      </footer>
    </>
  );
}
export function AuthenticationShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <SkipLinks />
      <main id="main-content" className="nr-auth-shell">
        <Brand />
        <section className="nr-auth-card">
          <PageHeader eyebrow="Secure Nation Reserve account" title={title} />
          {children}
        </section>
        <nav aria-label="Account help">
          <a href="/support">Help</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/">Return to public website</a>
        </nav>
      </main>
    </>
  );
}
function OrganizationSwitcher() {
  const context = useOrganization();
  return (
    <label className="nr-org-switcher">
      <span className="sr-only">Current organization</span>
      <select
        value={context.currentOrganization?.organizationId ?? ""}
        onChange={(event) => context.switchOrganization(event.target.value)}
      >
        <option value="" disabled>
          Choose organization
        </option>
        {context.memberships.map((m) => (
          <option key={m.organizationId} value={m.organizationId}>
            {m.organizationName} · {humanize(m.role)} · {humanize(m.status)}
          </option>
        ))}
      </select>
    </label>
  );
}
function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function ShellNavigation({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const context = useOrganization();
  const items = visibleNavigation(navigationRegistry, context);
  return (
    <nav
      id="primary-navigation"
      aria-label="Primary"
      className={mobile ? "nr-drawer-nav" : "nr-side-nav"}
    >
      {items.map((item) => (
        <a key={item.key} href={item.route} onClick={onNavigate}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
export function AuthenticatedShell({
  children,
  breadcrumbs = [],
}: {
  children: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  const context = useOrganization();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const role = context.currentOrganization?.role ?? "No active role";
  return (
    <div className="nr-app-shell">
      <SkipLinks />
      <header className="nr-topbar">
        <Button
          variant="quiet"
          className="nr-mobile-menu"
          aria-expanded={menu}
          onClick={() => setMenu(true)}
        >
          ☰<span className="sr-only"> Open navigation</span>
        </Button>
        <Brand />
        <OrganizationSwitcher />
        <span className="nr-role">{humanize(role)}</span>
        <Button variant="quiet" onClick={() => setSearch(true)}>
          Search <kbd>Ctrl K</kbd>
        </Button>
        <a href="/support">Help</a>
        <Button
          variant="quiet"
          aria-expanded={notifications}
          onClick={() => setNotifications(!notifications)}
        >
          Notifications{" "}
          {context.unreadNotifications > 0 && (
            <span className="nr-count">{context.unreadNotifications}</span>
          )}
        </Button>
        <Button
          variant="quiet"
          aria-expanded={userMenu}
          onClick={() => setUserMenu(!userMenu)}
        >
          {context.user.name}
        </Button>
      </header>
      {context.currentOrganization?.status === "restricted" && (
        <Alert tone="warning" title="Organization restricted">
          Some actions are unavailable. Review the stated requirements or contact
          support.
        </Alert>
      )}
      <ShellNavigation />
      <main id="main-content" className="nr-shell-main">
        <nav aria-label="Breadcrumb">
          <ol className="nr-breadcrumbs">
            {breadcrumbs.map((item, index) => (
              <li key={item.label}>
                {item.href && index < breadcrumbs.length - 1 ? (
                  <a href={item.href}>{item.label}</a>
                ) : (
                  <span aria-current="page">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {children}
      </main>
      {menu && (
        <div
          className="nr-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <Button variant="quiet" onClick={() => setMenu(false)}>
            Close
          </Button>
          <ShellNavigation mobile onNavigate={() => setMenu(false)} />
        </div>
      )}
      <Dialog
        open={search}
        title="Search RoboWorkPool"
        onClose={() => setSearch(false)}
      >
        <label>
          Search permitted records
          <input type="search" autoFocus />
        </label>
        <p>Search results are filtered by your current organization and permissions.</p>
      </Dialog>
      {notifications && (
        <aside className="nr-popover" aria-label="Notification center">
          <h2>Notifications</h2>
          <p>
            {context.unreadNotifications
              ? `${context.unreadNotifications} unread notification${context.unreadNotifications === 1 ? "" : "s"}.`
              : "You’re all caught up."}
          </p>
          <a href="/notifications">View notification center</a>
        </aside>
      )}
      {userMenu && (
        <aside className="nr-popover nr-user-menu">
          <strong>{context.user.name}</strong>
          <span>{context.user.email}</span>
          <span>{context.currentOrganization?.organizationName}</span>
          <span>{humanize(role)}</span>
          <button onClick={() => setTheme("system")}>Use system theme</button>
          <a href="/account">Account settings</a>
          <a href="/logout">Sign out securely</a>
        </aside>
      )}
    </div>
  );
}
export function PlatformShell({
  children,
  breadcrumbs = [],
}: {
  children: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  const context = useOrganization();
  return (
    <>
      <div className={`nr-environment nr-environment--${context.environment}`}>
        {humanize(context.environment)} environment
      </div>
      <AuthenticatedShell breadcrumbs={breadcrumbs}>{children}</AuthenticatedShell>
    </>
  );
}
export function RestrictedPage({
  reason = "Your current role does not allow this action.",
}: {
  reason?: string;
}) {
  const context = useOrganization();
  return (
    <section className="nr-state">
      <h1>Access restricted</h1>
      <p>{reason}</p>
      <dl>
        <dt>Organization</dt>
        <dd>{context.currentOrganization?.organizationName ?? "None selected"}</dd>
        <dt>Current role</dt>
        <dd>{humanize(context.currentOrganization?.role ?? "None")}</dd>
      </dl>
      <a href="/organizations/select">Switch organization</a>{" "}
      <a href="/support">Contact support</a>
    </section>
  );
}
export function MaintenancePage({
  subsystem = "RoboWorkPool",
  expectedEnd,
}: {
  subsystem?: string;
  expectedEnd?: string;
}) {
  return (
    <section className="nr-state">
      <h1>{subsystem} is undergoing maintenance</h1>
      <p>Some actions are temporarily unavailable. Your data has not been lost.</p>
      {expectedEnd && <p>Expected end: {expectedEnd}</p>}
      <a href="/status">View service status</a>
    </section>
  );
}
export function NotFoundPage() {
  return (
    <section className="nr-state">
      <h1>Page not found</h1>
      <p>
        The page may have moved, or it may not be available in your current
        organization.
      </p>
      <a href="/">Return to a safe page</a>
    </section>
  );
}
export function SessionExpiredPage() {
  return (
    <section className="nr-state">
      <h1>Your session expired</h1>
      <p>
        Sign in again to continue. Unsaved information may need to be entered again.
      </p>
      <a className="nr-button nr-button--primary" href="/login">
        Return to login
      </a>
    </section>
  );
}
export function FeatureUnavailablePage() {
  return (
    <section className="nr-state">
      <h1>Feature unavailable</h1>
      <p>This feature is not enabled for your current organization or environment.</p>
      <a href="/support">Get help</a>
    </section>
  );
}
export class ShellErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; reference: string }
> {
  override state = { failed: false, reference: "" };
  static getDerivedStateFromError() {
    return {
      failed: true,
      reference: `RWP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Shell render failure", {
      name: error.name,
      reference: this.state.reference,
      componentStack: info.componentStack,
    });
  }
  override render() {
    if (this.state.failed)
      return (
        <section className="nr-state" role="alert">
          <h1>RoboWorkPool could not display this page</h1>
          <p>
            Try again or return to a safe page. No internal diagnostic information is
            shown.
          </p>
          <p>
            Support reference: <code>{this.state.reference}</code>
          </p>
          <button onClick={() => this.setState({ failed: false, reference: "" })}>
            Try again
          </button>{" "}
          <a href="/">Return to a safe page</a>
        </section>
      );
    return this.props.children;
  }
}
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    addEventListener("beforeunload", handler);
    return () => removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
export const developmentSessions: Record<string, SessionContext> = {
  owner: {
    user: { id: "usr-owner", name: "Avery Owner", email: "owner@example.test" },
    memberships: [
      {
        organizationId: "org-owner",
        organizationName: "Atlas Robot Ownership",
        organizationType: "robot_owner",
        role: "robot_owner_administrator",
        status: "active",
        permissions: [],
      },
    ],
    currentOrganization: null,
    environment: "development",
    featureFlags: {},
    maintenance: [],
    unreadNotifications: 1,
  },
  company: {
    user: {
      id: "usr-company",
      name: "Casey Operations",
      email: "operations@example.test",
    },
    memberships: [
      {
        organizationId: "org-company",
        organizationName: "Northstar Logistics and Distribution",
        organizationType: "hiring_company",
        role: "hiring_company_operations",
        status: "active",
        permissions: [],
      },
    ],
    currentOrganization: null,
    environment: "development",
    featureFlags: {},
    maintenance: [],
    unreadNotifications: 0,
  },
  manufacturer: {
    user: { id: "usr-maker", name: "Morgan Engineer", email: "engineer@example.test" },
    memberships: [
      {
        organizationId: "org-maker",
        organizationName: "Precision Robotics",
        organizationType: "manufacturer",
        role: "manufacturer_developer",
        status: "active",
        permissions: [],
      },
    ],
    currentOrganization: null,
    environment: "development",
    featureFlags: {},
    maintenance: [],
    unreadNotifications: 0,
  },
  platform: {
    user: { id: "usr-admin", name: "Riley Admin", email: "admin@example.test" },
    memberships: [
      {
        organizationId: "org-platform",
        organizationName: "Nation Reserve Platform",
        organizationType: "platform",
        role: "platform_administrator",
        status: "active",
        permissions: ["platform:*"],
      },
    ],
    currentOrganization: null,
    environment: "production",
    featureFlags: {},
    maintenance: [],
    unreadNotifications: 2,
  },
};
for (const session of Object.values(developmentSessions))
  session.currentOrganization = session.memberships[0] ?? null;
