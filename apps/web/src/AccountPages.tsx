import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  FormField,
  PageHeader,
  StatusBadge,
  Stepper,
  setTheme,
  type ThemeMode,
} from "@nation-reserve/design-system";
import {
  AuthenticationShell,
  SessionExpiredPage,
} from "@nation-reserve/application-shell";
import { api } from "./auth-client.js";

type ApiError = Error & { code?: string };
type Account = {
  id?: string;
  displayName?: string;
  email?: string;
  emailVerifiedAt?: string | null;
  status?: string;
  timezone?: string;
};
type Organization = {
  id: string;
  displayName?: string;
  legalName?: string;
  name?: string;
  type?: string;
  role?: string;
  status?: string;
  lastAccessedAt?: string;
};
type Session = {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt?: string;
  lastSeenAt?: string;
  current?: boolean;
  status?: string;
};
const navigate = (path: string) => {
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
};
function errorMessage(error: unknown) {
  const code = (error as ApiError)?.code;
  const messages: Record<string, string> = {
    INVALID_CREDENTIALS: "Email or password is invalid.",
    ACCOUNT_SUSPENDED: "This account is restricted. Contact support for next steps.",
    RATE_LIMITED: "Too many attempts. Wait before trying again.",
    INVALID_VERIFICATION_TOKEN:
      "This verification link is invalid, expired, or already used.",
    INVALID_RESET_TOKEN: "This reset link is invalid, expired, or already used.",
    SESSION_EXPIRED: "Your session expired. Sign in again.",
    MAINTENANCE_MODE: "Authentication is temporarily unavailable during maintenance.",
  };
  return (
    messages[code ?? ""] ??
    (error instanceof Error ? error.message : "The request could not be completed.")
  );
}
function AuthPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <AuthenticationShell title={title}>
      <p>{intro}</p>
      {children}
      <nav className="account-help" aria-label="Authentication help">
        <a href="/support">Need help?</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/accessibility">Accessibility</a>
        <a href="/status">Status</a>
      </nav>
    </AuthenticationShell>
  );
}
function Field({
  name,
  label,
  type = "text",
  autoComplete,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <FormField label={label} required={required}>
      <input
        aria-label={label}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
    </FormField>
  );
}
function Registration() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("passwordConfirmation")) {
      setError("Passwords do not match. Enter the same password twice.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/v1/auth/register", {
        displayName: data.get("displayName"),
        email: data.get("email"),
        password: data.get("password"),
        passwordConfirmation: data.get("passwordConfirmation"),
        acceptTerms: data.get("terms") === "on",
        acceptPrivacy: data.get("privacy") === "on",
      });
      setSubmitted(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  if (submitted)
    return (
      <AuthPage
        title="Check your email"
        intro="Your Nation Reserve account was created. Verify your email before joining or creating an organization."
      >
        <Alert title="Verification protects your account">
          Follow the single-use verification link sent to your email. After
          verification, you can join or create organizations for any authorized
          RoboWorkPool role.
        </Alert>
        <a href="/verify-email/pending">Verification help</a>
      </AuthPage>
    );
  return (
    <AuthPage
      title="Create your Nation Reserve account"
      intro="Create one account, then join or create the Robot Owner, Hiring Company, or Robot Manufacturer organizations you are authorized to use."
    >
      <form
        className="account-form"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <Field name="displayName" label="Name" autoComplete="name" />
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <Field
          name="password"
          label="Password (12 or more characters)"
          type="password"
          autoComplete="new-password"
        />
        <Field
          name="passwordConfirmation"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
        />
        <label className="check">
          <input required type="checkbox" name="terms" /> I accept the{" "}
          <a href="/terms">Terms of Service</a>.
        </label>
        <label className="check">
          <input required type="checkbox" name="privacy" /> I acknowledge the{" "}
          <a href="/privacy">Privacy Policy</a>.
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
      <p>
        Already registered? <a href="/login">Log in</a>.
      </p>
    </AuthPage>
  );
}
function RegistrationSuccess() {
  return (
    <AuthPage
      title="Check your email"
      intro="Your Nation Reserve account request was accepted. Verify your email before entering an organization."
    >
      <Alert title="Verification protects your account">
        Verification confirms that you control the address used for account recovery and
        organization invitations. Links expire under the current security policy and can
        be resent safely.
      </Alert>
      <a href="/verify-email/pending">View verification help</a>
    </AuthPage>
  );
}
function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await api.login(
        String(data.get("email")),
        String(data.get("password")),
      );
      navigate(
        result.emailVerified ? "/organizations/select" : "/verify-email/pending",
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthPage
      title="Log in to Nation Reserve"
      intro="Use the same Nation Reserve account across the products and organizations you are authorized to access."
    >
      <form className="account-form" onSubmit={submit}>
        <Field name="email" label="Email" type="email" autoComplete="username" />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <label className="check">
          <input type="checkbox" name="remember" /> Remember this device, subject to
          session security policy.
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button type="submit" loading={loading}>
          Log in
        </Button>
      </form>
      <p>
        <a href="/forgot-password">Forgot password?</a> ·{" "}
        <a href="/verify-email/pending">Resend verification</a> ·{" "}
        <a href="/register">Create account</a>
      </p>
      <Alert title="Security note">
        RoboWorkPool does not reveal whether an unknown email belongs to an account
        during recovery.
      </Alert>
    </AuthPage>
  );
}
function Verification({ mode }: { mode: "confirm" | "pending" | "complete" }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = new URLSearchParams(location.search).get("token") ?? "";
  async function confirm() {
    try {
      await api.post("/api/v1/auth/email-verification/confirm", { token });
      navigate("/verify-email/complete");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    await api
      .post("/api/v1/auth/email-verification/request", { email })
      .catch(() => undefined);
    setMessage("If the address is eligible, a new verification message has been sent.");
  }
  if (mode === "complete")
    return (
      <AuthPage
        title="Email verified"
        intro="Your email is verified. Continue to organization selection or create an organization."
      >
        <Button onClick={() => navigate("/organizations/select")}>Continue</Button>
      </AuthPage>
    );
  if (mode === "confirm")
    return (
      <AuthPage
        title="Verify your email"
        intro="Confirm this single-use link to protect account recovery and organization invitations."
      >
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button onClick={() => void confirm()} disabled={token.length < 32}>
          Verify email
        </Button>
        {token.length < 32 && (
          <p>This link is incomplete. Request a replacement below.</p>
        )}
        <a href="/verify-email/pending">Request another link</a>
      </AuthPage>
    );
  return (
    <AuthPage
      title="Email verification pending"
      intro="Verification links are single-use and expire according to the active security configuration. Requesting another link invalidates older active links."
    >
      <form className="account-form" onSubmit={resend}>
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <Button type="submit">Resend verification</Button>
      </form>
      {message && <p role="status">{message}</p>}
      <p>
        Already verified? <a href="/login">Return to login</a>.
      </p>
    </AuthPage>
  );
}
function ForgotPassword() {
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    await api
      .post("/api/v1/auth/password-reset/request", { email })
      .catch(() => undefined);
    setSent(true);
  }
  return (
    <AuthPage
      title="Reset your password"
      intro="Enter your email. For privacy, the response is the same whether or not an eligible account exists."
    >
      {sent ? (
        <Alert title="Check your email if eligible">
          If the account is eligible, a single-use password-reset message has been sent.
        </Alert>
      ) : (
        <form className="account-form" onSubmit={submit}>
          <Field name="email" label="Email" type="email" autoComplete="email" />
          <Button type="submit">Send reset link</Button>
        </form>
      )}
    </AuthPage>
  );
}
function ResetPassword() {
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const token = new URLSearchParams(location.search).get("token") ?? "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("passwordConfirmation")) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await api.post("/api/v1/auth/password-reset/confirm", {
        token,
        password: data.get("password"),
        passwordConfirmation: data.get("passwordConfirmation"),
      });
      setComplete(true);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  if (complete)
    return (
      <AuthPage
        title="Password changed"
        intro="Your prior sessions were revoked according to the active security policy."
      >
        <a href="/login">Log in with your new password</a>
      </AuthPage>
    );
  return (
    <AuthPage
      title="Choose a new password"
      intro="Reset links are single-use. Use at least 12 characters and a password you do not reuse elsewhere."
    >
      <form className="account-form" onSubmit={submit}>
        <Field
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
        />
        <Field
          name="passwordConfirmation"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={token.length < 32}>
          Change password
        </Button>
      </form>
    </AuthPage>
  );
}
function Invitation({ accept }: { accept: boolean }) {
  const [status, setStatus] = useState("");
  const token = new URLSearchParams(location.search).get("token") ?? "";
  async function decide(choice: "accept" | "decline") {
    if (choice === "decline") {
      setStatus("Invitation declined locally. No organization membership was created.");
      return;
    }
    try {
      await api.post("/api/v1/invitations/accept", { token });
      setStatus("Invitation accepted. Continue to organization selection.");
    } catch (cause) {
      setStatus(errorMessage(cause));
    }
  }
  return (
    <AuthPage
      title={accept ? "Accept organization invitation" : "Organization invitation"}
      intro="Review the inviting organization, role, and resulting access before accepting. Invitation secrets never appear in visible page content."
    >
      <Alert title="Invitation details require authenticated preview">
        The existing API accepts an opaque token but does not provide a safe
        invitation-preview endpoint. Inviter, organization, role, and permission details
        cannot be displayed until that endpoint exists.
      </Alert>
      {status ? (
        <p role="status">{status}</p>
      ) : (
        <div className="public-actions">
          <Button onClick={() => void decide("accept")} disabled={token.length < 32}>
            Accept invitation
          </Button>
          <Button variant="secondary" onClick={() => void decide("decline")}>
            Decline
          </Button>
        </div>
      )}
      <a href="/logout">Need a different account?</a>
    </AuthPage>
  );
}
function Logout() {
  const [open, setOpen] = useState(true);
  const [done, setDone] = useState(false);
  async function confirm() {
    await api.logout().catch(() => undefined);
    setOpen(false);
    setDone(true);
  }
  return (
    <AuthPage
      title="Sign out safely"
      intro="Signing out ends this browser session on the server. Other device sessions remain active unless you revoke them separately."
    >
      {done ? (
        <Alert title="Signed out">
          This browser session has ended. <a href="/login">Return to login</a>.
        </Alert>
      ) : (
        <Dialog
          open={open}
          title="Sign out of this device?"
          onClose={() => navigate("/account")}
        >
          <p>Unsaved changes may be lost. This action ends only the current session.</p>
          <Button onClick={() => void confirm()}>Sign out</Button>{" "}
          <Button variant="secondary" onClick={() => navigate("/account")}>
            Cancel
          </Button>
        </Dialog>
      )}
    </AuthPage>
  );
}

function useRemote<T>(path: string) {
  const [state, setState] = useState<{ loading: boolean; data?: T; error?: string }>({
    loading: true,
  });
  const load = () => {
    setState({ loading: true });
    void api
      .get<T>(path)
      .then((data) => setState({ loading: false, data }))
      .catch((cause) => setState({ loading: false, error: errorMessage(cause) }));
  };
  useEffect(load, [path]);
  return { ...state, retry: load };
}
function AccountLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="account-page">
      <PageHeader
        eyebrow="Nation Reserve account"
        title={title}
        description={description}
      />
      <nav className="account-tabs" aria-label="Account sections">
        {[
          ["Overview", "/account"],
          ["Profile", "/account/profile"],
          ["Security", "/account/security"],
          ["Sessions", "/account/sessions"],
          ["Preferences", "/account/preferences"],
          ["Organizations", "/account/organizations"],
          ["Notifications", "/account/notifications"],
        ].map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      {children}
    </section>
  );
}
function AccountOverview() {
  const remote = useRemote<Account>("/api/v1/account");
  return (
    <AccountLayout
      title="Your Nation Reserve account"
      description="Review shared identity, verification, organizations, security, preferences, and sessions from one place."
    >
      {remote.loading ? (
        <p role="status">Loading account…</p>
      ) : remote.error ? (
        <ErrorState description={remote.error} onRetry={remote.retry} />
      ) : (
        <Cards>
          <Summary
            title="Profile"
            text={remote.data?.displayName ?? "Name unavailable"}
            href="/account/profile"
          />
          <Summary
            title="Email verification"
            text={remote.data?.emailVerifiedAt ? "Verified" : "Verification required"}
            href="/verify-email/pending"
          />
          <Summary
            title="Security"
            text="Password and session controls"
            href="/account/security"
          />
          <Summary
            title="Organizations"
            text="Roles and active context"
            href="/account/organizations"
          />
        </Cards>
      )}
    </AccountLayout>
  );
}
function Cards({ children }: { children: ReactNode }) {
  return <div className="account-grid">{children}</div>;
}
function Summary({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <article className="nr-card">
      <h2>{title}</h2>
      <p>{text}</p>
      <a href={href}>Review {title.toLowerCase()}</a>
    </article>
  );
}
function Profile() {
  const remote = useRemote<Account>("/api/v1/account");
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const displayName = String(new FormData(e.currentTarget).get("displayName"));
    await api.patch("/api/v1/account", { displayName });
    setMessage("Profile name saved.");
  }
  return (
    <AccountLayout
      title="Profile"
      description="Manage the name shown across Nation Reserve and review shared account information."
    >
      {remote.loading ? (
        <p>Loading profile…</p>
      ) : remote.error ? (
        <ErrorState description={remote.error} onRetry={remote.retry} />
      ) : (
        <form className="account-form" onSubmit={submit}>
          <Field name="displayName" label="Display name" autoComplete="name" />
          <FormField label="Email">
            <input value={remote.data?.email ?? ""} readOnly aria-readonly="true" />
          </FormField>
          <FormField label="Avatar">
            <input type="file" disabled aria-describedby="avatar-help" />
            <span id="avatar-help">
              Avatar upload is not supported by the current account API.
            </span>
          </FormField>
          <FormField label="Language">
            <select disabled>
              <option>English (United States)</option>
            </select>
          </FormField>
          <Button type="submit">Save profile</Button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
    </AccountLayout>
  );
}
function Security() {
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await api.post("/api/v1/account/password/change", {
        currentPassword: data.get("currentPassword"),
        newPassword: data.get("newPassword"),
      });
      setMessage("Password changed. Sign in again on this device.");
    } catch (cause) {
      setMessage(errorMessage(cause));
    }
  }
  return (
    <AccountLayout
      title="Security"
      description="Change your password, review verification, and understand recent-authentication and recovery controls."
    >
      <Cards>
        <Summary
          title="Verified email"
          text="Required for recovery and invitation acceptance"
          href="/verify-email/pending"
        />
        <Summary
          title="Active sessions"
          text="Review and revoke devices"
          href="/account/sessions"
        />
        <Summary
          title="Step-up authentication"
          text="Foundation prepared; enrollment is not yet implemented"
          href="/support"
        />
      </Cards>
      <form className="account-form" onSubmit={submit}>
        <Field
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
        />
        <Field
          name="newPassword"
          label="New password (12 or more characters)"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit">Change password</Button>
        {message && <p role="status">{message}</p>}
      </form>
      <Alert title="Recovery options">
        Password reset uses verified email. Do not claim MFA or additional recovery
        methods are enabled until their backend workflows exist.
      </Alert>
    </AccountLayout>
  );
}
function Sessions() {
  const remote = useRemote<Session[]>("/api/v1/account/sessions");
  const [confirm, setConfirm] = useState<Session | null>(null);
  async function revoke() {
    if (!confirm) return;
    await api.delete(`/api/v1/account/sessions/${confirm.id}`);
    setConfirm(null);
    remote.retry();
  }
  return (
    <AccountLayout
      title="Sessions"
      description="Review devices using your account and revoke sessions you no longer recognize."
    >
      {remote.loading ? (
        <p>Loading sessions…</p>
      ) : remote.error ? (
        <ErrorState description={remote.error} onRetry={remote.retry} />
      ) : !remote.data?.length ? (
        <EmptyState
          title="Only this session may be active"
          description="No additional sessions were returned."
        />
      ) : (
        <DataTable
          caption="Account sessions"
          rows={remote.data}
          getKey={(row) => row.id}
          columns={[
            {
              key: "device",
              label: "Device and browser",
              render: (row) => row.userAgent ?? "Unknown device",
            },
            {
              key: "location",
              label: "Approximate location",
              render: (row) => row.ipAddress ?? "Unavailable",
            },
            {
              key: "last",
              label: "Last active",
              render: (row) => row.lastSeenAt ?? "Unavailable",
            },
            {
              key: "status",
              label: "Status",
              render: (row) =>
                row.current ? "Current session" : (row.status ?? "Active"),
            },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <Button
                  variant="danger"
                  disabled={row.current}
                  onClick={() => setConfirm(row)}
                >
                  Revoke
                </Button>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={Boolean(confirm)}
        title="Revoke this session?"
        onClose={() => setConfirm(null)}
      >
        <p>
          The selected device will need to sign in again. This action does not change
          your password.
        </p>
        <Button variant="danger" onClick={() => void revoke()}>
          Revoke session
        </Button>
      </Dialog>
    </AccountLayout>
  );
}
function Preferences() {
  const initial = (localStorage.getItem("nr-theme") as ThemeMode | null) ?? "system";
  const [theme, setLocalTheme] = useState<ThemeMode>(initial);
  const [density, setDensity] = useState(
    localStorage.getItem("nr-density") ?? "comfortable",
  );
  function save() {
    setTheme(theme);
    localStorage.setItem("nr-density", density);
    document.documentElement.dataset.density = density;
  }
  return (
    <AccountLayout
      title="Preferences"
      description="Choose presentation preferences that follow you across the Nation Reserve web experience."
    >
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <FormField label="Theme">
          <select
            aria-label="Theme"
            value={theme}
            onChange={(e) => setLocalTheme(e.target.value as ThemeMode)}
          >
            <option value="system">Use system setting</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </FormField>
        <FormField label="Density">
          <select
            aria-label="Density"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </FormField>
        <label className="check">
          <input
            type="checkbox"
            defaultChecked={
              window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
            }
          />{" "}
          Prefer reduced motion
        </label>
        <FormField label="Timezone">
          <select aria-label="Timezone" defaultValue="UTC">
            <option value="UTC">UTC</option>
            <option disabled>
              Organization timezones load from account configuration later
            </option>
          </select>
        </FormField>
        <FormField label="Date format">
          <select aria-label="Date format" defaultValue="en-US">
            <option value="en-US">Month day, year</option>
          </select>
        </FormField>
        <Button type="submit">Save preferences</Button>
      </form>
    </AccountLayout>
  );
}
function Organizations({ selectOnly = false }: { selectOnly?: boolean }) {
  const remote = useRemote<Organization[]>("/api/v1/account/organizations");
  async function enter(id: string) {
    await api.post("/api/v1/account/default-organization", { organizationId: id });
    sessionStorage.setItem("nr-active-organization", id);
    navigate("/account");
  }
  const content = remote.loading ? (
    <p role="status">Loading organizations…</p>
  ) : remote.error ? (
    <ErrorState description={remote.error} onRetry={remote.retry} />
  ) : !remote.data?.length ? (
    <EmptyState
      title="You do not belong to an organization yet"
      description="Create a Robot Owner, Hiring Company, or Robot Manufacturer organization, or accept an invitation."
      action={<a href="/organizations/create">Create an organization</a>}
    />
  ) : (
    <div className="organization-list">
      {remote.data.map((org) => (
        <article className="nr-card" key={org.id}>
          <StatusBadge
            status={
              org.status === "active" ? "general.active" : "general.requires_action"
            }
          />
          <h2>{org.displayName ?? org.legalName ?? org.name ?? "Organization"}</h2>
          <dl>
            <dt>Type</dt>
            <dd>{org.type?.replaceAll("_", " ") ?? "Unavailable"}</dd>
            <dt>Role</dt>
            <dd>{org.role?.replaceAll("_", " ") ?? "Unavailable"}</dd>
            <dt>Last accessed</dt>
            <dd>{org.lastAccessedAt ?? "Not recorded"}</dd>
          </dl>
          <Button onClick={() => void enter(org.id)}>Enter</Button>
        </article>
      ))}
    </div>
  );
  if (selectOnly)
    return (
      <AuthPage
        title="Choose an organization"
        intro="Your organization determines the role, permissions, and data context used in RoboWorkPool."
      >
        {content}
        <div className="public-actions">
          <a href="/organizations/create">Create organization</a>
          <a href="/accept-invitation">Accept invitation</a>
        </div>
      </AuthPage>
    );
  return (
    <AccountLayout
      title="Organizations"
      description="Switch among current memberships, review roles and status, or accept invitations."
    >
      {content}
      <p>
        <a href="/organizations/create">Create organization</a> ·{" "}
        <a href="/accept-invitation">Accept invitation</a>
      </p>
    </AccountLayout>
  );
}
function CreateOrganization() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<
    "robot-owner" | "hiring-company" | "manufacturer" | null
  >(null);
  const descriptions = {
    "robot-owner":
      "You own robots. Manufacturers verify eligible models and serials. Earnings arise only from verified operating time in fulfilled assignments.",
    "hiring-company":
      "You contract Robot Manufacturers, receive allocated robots, monitor verified operation, and receive invoices.",
    manufacturer:
      "You integrate supported models and production robots, fulfill contracts, and provide signed heartbeat evidence.",
  };
  return (
    <AuthPage
      title="Create an organization"
      intro="Choose the organization type first. Role-specific onboarding details are collected only after the shared account and organization foundation is ready."
    >
      <Stepper
        current={step}
        steps={[
          { label: "Choose type" },
          { label: "Understand next steps" },
          { label: "Create organization" },
        ]}
      />
      {step === 0 ? (
        <div className="choice-grid">
          {Object.entries(descriptions).map(([key, text]) => (
            <button
              key={key}
              type="button"
              className="choice"
              onClick={() => {
                setType(key as typeof type);
                setStep(1);
              }}
            >
              <strong>
                {key.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </strong>
              <span>{text}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <Alert title={`${type?.replaceAll("-", " ")} organization selected`}>
            {type ? descriptions[type] : "Choose a type."}
          </Alert>
          <p>
            The existing backend creates an organization only during role-specific
            public registration. A standalone authenticated organization-creation
            endpoint is required before this final step can submit.
          </p>
          <Button disabled>Create organization — API required</Button>{" "}
          <Button variant="secondary" onClick={() => setStep(0)}>
            Choose another type
          </Button>
        </>
      )}
    </AuthPage>
  );
}
function Notifications() {
  const [state, setState] = useState<{
      items: Array<{
        id: string;
        title: string;
        body: string;
        href?: string;
        status: string;
        createdAt: string;
      }>;
    }>({ items: [] }),
    [error, setError] = useState("");
  const load = () =>
    api
      .get<typeof state>("/api/v1/notifications?limit=100")
      .then(setState)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Unable to load notifications"),
      );
  useEffect(() => {
    void load();
  }, []);
  const unread = state.items.filter(
    (n) => n.status !== "read" && n.status !== "dismissed",
  ).length;
  return (
    <AccountLayout
      title="Notification center"
      description="Required transactional and preference-based messages from your authorized RoboWorkPool activity."
    >
      <p role="status">
        <strong>{unread}</strong> unread notifications
      </p>
      {error && <ErrorState description={error} />}{" "}
      {!error && state.items.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="New account, contract, funding, heartbeat, and training messages will appear here."
        />
      ) : (
        <div className="account-records">
          {state.items.map((n) => (
            <article className="nr-card" key={n.id}>
              <StatusBadge
                status={n.status === "read" ? "general.inactive" : "general.active"}
              />
              <h2>{n.title}</h2>
              <p>{n.body}</p>
              <time dateTime={n.createdAt}>
                {new Date(n.createdAt).toLocaleString()}
              </time>
              <div>
                {n.href && <a href={n.href}>Review</a>}{" "}
                {n.status !== "read" && (
                  <Button
                    onClick={() =>
                      void api.post(`/api/v1/notifications/${n.id}/read`).then(load)
                    }
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}
function DeleteAccount() {
  const [open, setOpen] = useState(false);
  return (
    <AccountLayout
      title="Delete account"
      description="Understand historical retention and organizational effects before requesting account deletion."
    >
      <Alert tone="warning" title="Deletion does not erase required history">
        Organizations are not necessarily deleted. Ownership, contracts, assignments,
        audit records, financial records, disputes, security evidence, and
        legal-retention records may remain preserved or de-identified according to
        policy.
      </Alert>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Request account deletion
      </Button>
      <Dialog
        open={open}
        title="Account deletion is not currently available"
        onClose={() => setOpen(false)}
      >
        <p>
          A verified deletion-request API, recent-authentication check, retention
          disclosure, and recovery window are required. No deletion was performed.
        </p>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Keep account
        </Button>
      </Dialog>
    </AccountLayout>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function isSharedAccountRoute(path: string) {
  return [
    "/login",
    "/register",
    "/register/success",
    "/verify-email",
    "/verify-email/pending",
    "/verify-email/complete",
    "/forgot-password",
    "/reset-password",
    "/invitation",
    "/accept-invitation",
    "/logout",
    "/organizations/select",
    "/organizations/create",
    "/account",
    "/account/profile",
    "/account/security",
    "/account/sessions",
    "/account/preferences",
    "/account/organizations",
    "/account/notifications",
    "/account/api-consent",
    "/account/delete",
    "/session-expired",
  ].includes(path);
}
export function SharedAccountPage({ path }: { path: string }) {
  if (path === "/register") return <Registration />;
  if (path === "/register/success") return <RegistrationSuccess />;
  if (path === "/login") return <Login />;
  if (path === "/verify-email") return <Verification mode="confirm" />;
  if (path === "/verify-email/pending") return <Verification mode="pending" />;
  if (path === "/verify-email/complete") return <Verification mode="complete" />;
  if (path === "/forgot-password") return <ForgotPassword />;
  if (path === "/reset-password") return <ResetPassword />;
  if (path === "/invitation") return <Invitation accept={false} />;
  if (path === "/accept-invitation") return <Invitation accept />;
  if (path === "/logout") return <Logout />;
  if (path === "/organizations/select") return <Organizations selectOnly />;
  if (path === "/organizations/create") return <CreateOrganization />;
  if (path === "/account") return <AccountOverview />;
  if (path === "/account/profile") return <Profile />;
  if (path === "/account/security") return <Security />;
  if (path === "/account/sessions") return <Sessions />;
  if (path === "/account/preferences") return <Preferences />;
  if (path === "/account/organizations") return <Organizations />;
  if (path === "/account/notifications") return <Notifications />;
  if (path === "/account/delete") return <DeleteAccount />;
  if (path === "/session-expired") return <SessionExpiredPage />;
  return (
    <AccountLayout
      title="API consent"
      description="Future partner API consent will be implemented only after its authorization and legal requirements are approved."
    >
      <Alert title="Future feature">No API consent was granted.</Alert>
    </AccountLayout>
  );
}
