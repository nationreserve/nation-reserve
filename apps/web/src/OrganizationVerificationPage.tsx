import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AuthenticatedShell } from "@nation-reserve/application-shell";
import { Alert, PageHeader, StatusBadge } from "@nation-reserve/design-system";
import { api } from "./auth-client.js";

type VerificationStatus = {
  organizationType: string;
  individual: { status: string };
  organization: { businessStatus: string; representativeStatus: string };
  documents: Array<{
    id: string;
    documentType: string;
    status: string;
    filename: string;
  }>;
  requirements: string[];
};
type UploadIntent = {
  id: string;
  upload: { url: string; headers: Record<string, string> };
};
const organizationId = () =>
  sessionStorage.getItem("nr-active-organization") ??
  sessionStorage.getItem("currentOrganizationId") ??
  "";
export function OrganizationVerificationPage() {
  const org = organizationId(),
    [data, setData] = useState<VerificationStatus>(),
    [message, setMessage] = useState("");
  const load = useCallback(
    () =>
      api
        .get<VerificationStatus>(`/api/v1/organizations/${org}/verification`)
        .then(setData)
        .catch((error: unknown) =>
          setMessage(
            error instanceof Error ? error.message : "Unable to load verification",
          ),
        ),
    [org],
  );
  useEffect(() => {
    if (org) void load();
  }, [org, load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      file = form.get("document"),
      documentTypeValue = form.get("documentType"),
      documentType = typeof documentTypeValue === "string" ? documentTypeValue : "";
    if (!(file instanceof File) || !file.size)
      throw new Error("Choose a verification document.");
    const purpose =
      data?.organizationType === "manufacturer"
        ? "manufacturer_document"
        : "contract_document";
    const intent = await api.post<UploadIntent>(
      "/api/v1/storage/uploads",
      {
        organizationId: org,
        purpose,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
      { "Idempotency-Key": crypto.randomUUID() },
    );
    const upload = await fetch(intent.upload.url, {
      method: "PUT",
      headers: intent.upload.headers,
      body: file,
    });
    if (!upload.ok) throw new Error("Private document upload failed.");
    try {
      await api.post(`/api/v1/organizations/${org}/verification/documents`, {
        objectId: intent.id,
        documentType,
      });
      setMessage("Document submitted for platform review.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message} The private file may still be undergoing malware scanning; retry submission after scanning completes.`
          : "Unable to submit document.",
      );
    }
  }
  return (
    <AuthenticatedShell
      breadcrumbs={[
        { label: "Account", href: "/account" },
        { label: "Organization verification" },
      ]}
    >
      <main>
        <PageHeader
          eyebrow="Trust & safety"
          title="Business and representative verification"
          description="RoboWorkPool verifies the person, the business, and the authority to act for that business as separate trust requirements."
        />
        <Alert title="Private document handling">
          <p>
            Identity documents stay with Stripe Identity. Business or authorization
            evidence is stored only in the appropriate private organization bucket,
            malware scanned, and available only to authorized reviewers.
          </p>
        </Alert>
        <section className="state-grid">
          <article>
            <span>Individual identity</span>
            <StatusBadge
              status={
                data?.individual.status === "verified"
                  ? "general.active"
                  : "general.warning"
              }
            />
            <strong>{data?.individual.status ?? "Loading"}</strong>
          </article>
          <article>
            <span>Business verification</span>
            <strong>{data?.organization.businessStatus ?? "Loading"}</strong>
          </article>
          <article>
            <span>Representative authority</span>
            <strong>{data?.organization.representativeStatus ?? "Loading"}</strong>
          </article>
        </section>
        <p>
          <a href="/account/verification">
            Complete or review Stripe Identity verification
          </a>
        </p>
        {data?.organizationType !== "robot_owner" && (
          <form
            onSubmit={(event) => {
              void submit(event).catch((error: unknown) =>
                setMessage(
                  error instanceof Error ? error.message : "Submission failed",
                ),
              );
            }}
          >
            <h2>Submit supporting evidence</h2>
            <label>
              Document type
              <select name="documentType">
                <option value="business_registration">Business registration</option>
                <option value="tax_document">Tax document</option>
                <option value="representative_authorization">
                  Representative authorization
                </option>
                <option value="other">Other requested evidence</option>
              </select>
            </label>
            <label>
              Private document
              <input
                name="document"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
                required
              />
            </label>
            <button>Upload for review</button>
          </form>
        )}
        <h2>Submitted documents</h2>
        {data?.documents.length ? (
          data.documents.map((item) => (
            <article key={item.id}>
              <strong>{item.filename}</strong>
              <p>
                {item.documentType.replaceAll("_", " ")} · {item.status}
              </p>
            </article>
          ))
        ) : (
          <p>No supporting documents submitted.</p>
        )}
        {message && <p role="status">{message}</p>}
      </main>
    </AuthenticatedShell>
  );
}
