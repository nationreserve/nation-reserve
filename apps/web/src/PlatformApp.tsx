import { useEffect, useState, type FormEvent } from "react";
import {DataView} from "./DataView.js";
import { api } from "./auth-client.js";
import { IntegrationPage } from "./IntegrationPages.js";
import { OperationsPage } from "./OperationsPages.js";
import { FinancialPage } from "./FinancialPages.js";
import { ContractPage } from "./ContractPages.js";
import { PaymentPage } from "./PaymentPages.js";
import { OperationsCenterPage } from "./OperationsCenterPages.js";
import { ReportingPage } from "./ReportingPages.js";
import { SpecificationPage } from "./SpecificationPages.js";
import { ComponentGallery } from "./ComponentGallery.js";
import { isSharedAccountRoute, SharedAccountPage } from "./AccountPages.js";
import { AuthenticatedShell, AuthenticationShell, developmentSessions, OrganizationProvider, PlatformShell } from "@nation-reserve/application-shell";
import { isPublicRoute, PublicPage } from "./PublicPages.js";
import { AcceptancePage } from "./AcceptancePage.js";
import { GuidedTrainingPage } from "./GuidedTrainingPages.js";
import { AdminCompletionPage, QueuePage, SupportPage } from "./PlatformCompletionPages.js";
import { CompanyPage } from "./CompanyPages.js";
import { ManufacturerPage } from "./ManufacturerPages.js";

const registrationTypes = {
  "robot-owner": ["Become a Robot Owner", "Create an owner organization before claiming a robot."],
  "hiring-company": ["Register a Hiring Company", "Begin company onboarding; billing is not requested yet."],
  manufacturer: ["Register as a Manufacturer", "Begin review; production API access remains disabled."],
} as const;
function navigate(path: string) { history.pushState({}, "", path); dispatchEvent(new PopStateEvent("popstate")); }
function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  return <AuthenticationShell title={title}><section className="page-card">{children}</section></AuthenticationShell>;
}
function RegisterLanding() {
  return <Layout title="Choose how you’ll use RoboWorkPool"><div className="choice-grid">
    {Object.entries(registrationTypes).map(([key, [title, text]]) => <button className="choice" key={key}
      onClick={() => navigate(`/register/${key}`)}><strong>{title}</strong><span>{text}</span></button>)}
  </div><p>Already have an account? <a href="/login">Log in</a></p></Layout>;
}
function RegistrationForm({ kind }: { kind: keyof typeof registrationTypes }) {
  const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("passwordConfirmation")) { setError("Passwords do not match."); return; }
    try {
      await api.post(`/api/v1/auth/register/${kind}`, {
        email: data.get("email"), password: data.get("password"),
        passwordConfirmation: data.get("passwordConfirmation"), displayName: data.get("displayName"),
        organizationLegalName: data.get("legalName"), organizationDisplayName: data.get("organizationName"),
        acceptTerms: data.get("terms") === "on",
      }); setSent(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Registration failed."); }
  }
  if (sent) return <Layout title="Verify your email"><p>We sent a verification message. Follow its single-use link to continue.</p></Layout>;
  return <Layout title={registrationTypes[kind][0]}><p>{registrationTypes[kind][1]}</p>
    <form onSubmit={(e) => void submit(e)}><Field name="email" label="Email" type="email" />
      <Field name="displayName" label="Your display name" /><Field name="legalName" label="Organization legal name" />
      <Field name="organizationName" label="Organization display name" />
      <Field name="password" label="Password (12+ characters)" type="password" />
      <Field name="passwordConfirmation" label="Confirm password" type="password" />
      <label className="check"><input required type="checkbox" name="terms" /> I accept the terms.</label>
      {error && <p role="alert" className="error">{error}</p>}<button>Create account</button>
    </form><a href="/register">Choose a different registration type</a></Layout>;
}
function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return <label>{label}<input required name={name} type={type} /></label>;
}
function Login() {
  const [error, setError] = useState(""); const [show, setShow] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try { await api.login(data.get("email") as string, data.get("password") as string); navigate("/account"); }
    catch { setError("Email or password is invalid."); }
  }
  return <Layout title="Log in"><form onSubmit={(e) => void submit(e)}><Field name="email" label="Email" type="email" />
    <Field name="password" label="Password" type={show ? "text" : "password"} />
    <label className="check"><input type="checkbox" onChange={(e) => setShow(e.target.checked)} /> Show password</label>
    {error && <p role="alert" className="error">{error}</p>}<button>Log in</button></form>
    <p><a href="/forgot-password">Forgot password?</a> · <a href="/register">Create an account</a></p></Layout>;
}
function TokenPage({ reset = false }: { reset?: boolean }) {
  const [message, setMessage] = useState(""); const token = new URLSearchParams(location.search).get("token") ?? "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try { await api.post(reset ? "/api/v1/auth/password-reset/confirm" : "/api/v1/auth/email-verification/confirm",
      reset ? { token, password: data.get("password"), passwordConfirmation: data.get("passwordConfirmation") } : { token });
      setMessage(reset ? "Password changed. You can log in." : "Email verified. You can continue.");
    } catch { setMessage("This link is invalid, expired, or already used."); }
  }
  return <Layout title={reset ? "Reset password" : "Verify email"}><form onSubmit={(e) => void submit(e)}>
    {reset && <><Field name="password" label="New password" type="password" />
      <Field name="passwordConfirmation" label="Confirm password" type="password" /></>}
    <button>{reset ? "Change password" : "Verify email"}</button></form>{message && <p role="status">{message}</p>}</Layout>;
}
function ForgotPassword() {
  const [sent, setSent] = useState(false);
  return <Layout title="Reset your password">{sent ? <p>If the account is eligible, a reset message has been sent.</p> :
    <form onSubmit={(e) => { e.preventDefault(); const email = new FormData(e.currentTarget).get("email");
      void api.post("/api/v1/auth/password-reset/request", { email }).finally(() => setSent(true)); }}>
      <Field name="email" label="Email" type="email" /><button>Send reset link</button></form>}</Layout>;
}
function Account() {
  const [account, setAccount] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { void api.get<Record<string, unknown>>("/api/v1/account").then(setAccount).catch(() => navigate("/login")); }, []);
  return <Layout title="Account">{account ? <DataView data={account}/> : <p>Loading…</p>}
    <nav><a href="/account/security">Security</a> · <a href="/account/sessions">Sessions</a> ·
      <a href="/organizations/select">Organizations</a></nav></Layout>;
}
function DataPage({ title, endpoint }: { title: string; endpoint: string }) {
  const [data, setData] = useState<unknown>("Loading…");
  useEffect(() => { void api.get(endpoint).then(setData).catch(() => navigate("/login")); }, [endpoint]);
  return <Layout title={title}><DataView data={data}/></Layout>;
}
function RouteContent({ path }: { path: string }) {
  if (path === "/support" || path.startsWith("/support/")) return <SupportPage path={path} />;
  if (path === "/downpayment-queue") return <QueuePage />;
  if (path.startsWith("/platform/admin/")) return <AdminCompletionPage path={path} />;
  if (isSharedAccountRoute(path)) return <SharedAccountPage path={path} />;
  if (isPublicRoute(path)) return <PublicPage path={path} />;
  if (path === "/development/components") return <ComponentGallery />;
  if (path === "/register") return <RegisterLanding />;
  for (const kind of Object.keys(registrationTypes) as Array<keyof typeof registrationTypes>)
    if (path === `/register/${kind}`) return <RegistrationForm kind={kind} />;
  if (path === "/login") return <Login />;
  if (path === "/verify-email") return <TokenPage />;
  if (path === "/forgot-password") return <ForgotPassword />;
  if (path === "/reset-password") return <TokenPage reset />;
  if (path === "/account") return <Account />;
  if (path === "/account/security") return <Layout title="Account security"><p>Change your password and review verified channels.</p></Layout>;
  if (path === "/account/sessions") return <DataPage title="Sessions" endpoint="/api/v1/account/sessions" />;
  if (path === "/organizations/select") return <DataPage title="Choose organization" endpoint="/api/v1/account/organizations" />;
  if (/^\/organizations\/[^/]+\/settings$/.test(path)) return <Layout title="Organization settings"><p>Organization profile and status.</p></Layout>;
  if (/^\/organizations\/[^/]+\/members$/.test(path)) return <DataPage title="Organization members"
    endpoint={`/api/v1/organizations/${path.split("/")[2]}/members`} />;
  if (path === "/invitations/accept") return <TokenPage />;
  if (path==="/platform/specification" || path.startsWith("/platform/specification/")) return <SpecificationPage path={path} />;
  if (path==="/platform/acceptance" || path.startsWith("/platform/acceptance/")) return <AcceptancePage />;
  if (path==="/analytics" || path.startsWith("/analytics/") || path==="/reports" || path.startsWith("/reports/") || path.startsWith("/platform/executive") || path.startsWith("/owner/analytics") || path.startsWith("/company/analytics") || path.startsWith("/manufacturer/analytics")) return <ReportingPage path={path} />;
  if (path === "/platform" || path.startsWith("/platform/search") || path.startsWith("/platform/feature-flags") || path.startsWith("/platform/configuration") || path.startsWith("/platform/jobs") || path.startsWith("/platform/workers") || path.startsWith("/platform/health") || path.startsWith("/platform/incidents") || path.startsWith("/platform/maintenance") || path.startsWith("/platform/announcements") || path.startsWith("/platform/audit") || path.startsWith("/platform/diagnostics") || path.startsWith("/platform/alerts")) return <OperationsCenterPage path={path} />;
  if (path.includes("billing/payment-methods") || path.includes("payout-account") || path.startsWith("/company/payments") || path.startsWith("/owner/payouts") || path.startsWith("/platform/payments") || path.startsWith("/platform/payouts") || path.startsWith("/platform/payment-webhooks") || path.startsWith("/platform/payment-reconciliation") || path.startsWith("/platform/refunds") || path.startsWith("/platform/processor-disputes")) return <PaymentPage path={path} />;
  if (path.startsWith("/owner/earnings") || path.startsWith("/company/billing") || path.startsWith("/company/invoices") || path.startsWith("/platform/financial") || path.startsWith("/platform/journal") || path.startsWith("/platform/reconciliation") || path.startsWith("/platform/settlement")) return <FinancialPage path={path} />;
  if (path.startsWith("/owner/operations") || path.startsWith("/manufacturer/heartbeat") || path.startsWith("/company/operations") || path.startsWith("/platform/heartbeat") || path.startsWith("/platform/operating-time") || path.startsWith("/platform/downtime") || path.startsWith("/platform/incidents")) return <OperationsPage path={path} />;
  if (path.startsWith("/company/training-setup") || path.startsWith("/manufacturer/training-requests")) return <GuidedTrainingPage path={path} />;
  if (path.startsWith("/company/contracts") || path.startsWith("/manufacturer/contracts") || path.includes("/assignments/")) return <ContractPage path={path} />;
  if (path.startsWith("/company")) return <CompanyPage path={path} />;
  if (path.startsWith("/manufacturer")) return <ManufacturerPage path={path} />;
  if (path.startsWith("/owner") || path.startsWith("/platform")) return <IntegrationPage path={path} />;
  return <PublicPage path="/errors/404" />;
}

export function PlatformApp() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => { const change = () => setPath(location.pathname); addEventListener("popstate", change); return () => removeEventListener("popstate", change); }, []);
  const isAuth = isSharedAccountRoute(path) && (!path.startsWith("/account") || path === "/account/api-consent") || path.startsWith("/register/") || path.includes("invitations/accept");
  const isPublic = isPublicRoute(path) && path !== "/support";
  if (isAuth || isPublic) return <RouteContent path={path} />;
  const fixture = path.startsWith("/platform") ? developmentSessions.platform! : path.startsWith("/company") ? developmentSessions.company! : path.startsWith("/manufacturer") ? developmentSessions.manufacturer! : developmentSessions.owner!;
  const content = <RouteContent path={path} />;
  return <OrganizationProvider initial={fixture}>{path.startsWith("/platform") ? <PlatformShell breadcrumbs={[{ label: "Platform", href: "/platform" }, { label: "Current page" }]}>{content}</PlatformShell> : <AuthenticatedShell breadcrumbs={[{ label: "RoboWorkPool", href: "/" }, { label: "Current page" }]}>{content}</AuthenticatedShell>}</OrganizationProvider>;
}



