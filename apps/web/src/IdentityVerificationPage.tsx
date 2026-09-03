import { useEffect, useState } from "react";
import { AuthenticatedShell } from "@nation-reserve/application-shell";
import { Alert, PageHeader } from "@nation-reserve/design-system";
import { api } from "./auth-client.js";

type IdentityStatus = {
  status:
    "unverified" | "pending" | "verified" | "requires_input" | "failed" | "cancelled";
  lastErrorCode?: string;
  verifiedAt?: string;
};
const descriptions: Record<IdentityStatus["status"], string> = {
  unverified: "Identity verification has not started.",
  pending: "Stripe is reviewing the submitted identity evidence.",
  verified: "Stripe confirmed the identity verification.",
  requires_input: "Stripe needs additional or corrected identity evidence.",
  failed: "Identity verification could not be completed.",
  cancelled: "The previous identity verification session was cancelled.",
};

export function IdentityVerificationPage() {
  const [state, setState] = useState<IdentityStatus>({ status: "unverified" });
  const [message, setMessage] = useState("");
  const load = () =>
    api
      .get<IdentityStatus>("/api/v1/account/identity-verification")
      .then(setState)
      .catch((error: unknown) =>
        setMessage(
          error instanceof Error ? error.message : "Unable to load identity status.",
        ),
      );
  useEffect(() => {
    void load();
  }, []);

  async function start() {
    setMessage("");
    try {
      const result = await api.post<IdentityStatus & { url?: string }>(
        "/api/v1/account/identity-verification/session",
        {},
        { "Idempotency-Key": crypto.randomUUID() },
      );
      setState(result);
      if (result.url) location.assign(result.url);
      else setMessage(descriptions[result.status]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start identity verification.",
      );
    }
  }

  return (
    <AuthenticatedShell
      breadcrumbs={[
        { label: "Account", href: "/account" },
        { label: "Identity verification" },
      ]}
    >
      <main>
        <PageHeader
          eyebrow="Trust & safety"
          title="Identity verification"
          description="Identity verification is separate from login, business verification, representative authority, and payout-account onboarding."
        />
        <Alert
          tone={
            state.status === "verified"
              ? "success"
              : state.status === "failed"
                ? "danger"
                : "info"
          }
          title={state.status.replaceAll("_", " ")}
        >
          {descriptions[state.status]}
        </Alert>
        <p>
          RoboWorkPool stores the verification state and Stripe session identifier, not
          raw identity documents.
        </p>
        {state.verifiedAt ? (
          <p>
            Verified: <time>{new Date(state.verifiedAt).toLocaleString()}</time>
          </p>
        ) : null}
        {state.status !== "verified" && state.status !== "pending" ? (
          <button onClick={() => void start()}>Verify identity with Stripe</button>
        ) : null}
        {state.status === "pending" ? (
          <button onClick={() => void load()}>Refresh status</button>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
      </main>
    </AuthenticatedShell>
  );
}
