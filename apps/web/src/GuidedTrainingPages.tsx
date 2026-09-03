import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useOrganization } from "@nation-reserve/application-shell";
import { api } from "./auth-client.js";

type Specification = {
  taskName?: string;
  taskDescription?: string;
  demonstrationInstructions?: string;
  numberOfDemonstrations?: number;
  targetRecordingDurationSeconds?: number;
  safetyRequirements?: string;
  privacyRequirements?: string;
};
type KitItem = {
  productId: string;
  name: string;
  requirementStatus: string;
  tier: number;
  purpose: string;
  compatibility: string;
  priceLabel?: string;
  referencePriceCents?: number;
  seller: string;
  subscriptionRequired?: boolean;
  purchaseUrl: string;
};
type TrainingFile = { id: string; streamType: string; validationStatus: string };
type Submission = {
  id: string;
  version: number;
  kind: string;
  status: string;
  recording_duration_seconds: number;
  files?: TrainingFile[];
};
type Review = {
  id: string;
  submission_version: number;
  decision: string;
  comments: string;
  accepted_streams?: string[];
  redo_streams?: string[];
  additional_recordings: number;
};
type TrainingData = {
  id: string;
  status?: string;
  manufacturer?: string;
  company?: string;
  robotModel?: string;
  requiredTier?: number;
  required_tier?: number;
  decision?: string;
  specification?: Specification;
  readiness?: { checklist?: Record<string, boolean> };
  kit?: KitItem[];
  submissions?: Submission[];
  reviews?: Review[];
  items?: TrainingData[];
};
type Capture = { id: string; status: string };
type UploadIntent = {
  id: string;
  upload: { url: string; headers: Record<string, string> };
};
type Details = Record<string, unknown>;
const formText = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};
const checks = [
  "Required devices present",
  "Device compatibility confirmed",
  "Devices charged",
  "Required apps installed",
  "Devices paired",
  "Firmware checked",
  "Storage available",
  "Cameras positioned",
  "Wearables positioned",
  "Recording indicators verified",
  "Devices calibrated",
  "Timestamps synchronized",
  "Privacy requirements reviewed",
  "Safety requirements reviewed",
  "Test recording completed",
];
function useOrganizationId() {
  return useOrganization().currentOrganization?.organizationId ?? "";
}
function go(path: string) {
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}
function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} />
    </label>
  );
}
export function GuidedTrainingPage({ path }: { path: string }) {
  const organizationId = useOrganizationId(),
    manufacturer = path.startsWith("/manufacturer"),
    id = path.split("/")[3];
  const [data, setData] = useState<TrainingData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const base = `/api/v1/organizations/${organizationId}/${manufacturer ? "manufacturer/training-requirements" : "company/training-requirements"}`;
  const reload = useCallback(
    () =>
      api
        .get<TrainingData>(id ? `${base}/${id}` : base)
        .then(setData)
        .catch((error: unknown) =>
          setError(error instanceof Error ? error.message : "Unable to load"),
        ),
    [base, id],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  if (error)
    return (
      <section className="page-card">
        <h1>Training data</h1>
        <p role="alert">{error}</p>
      </section>
    );
  if (!data) return <p role="status">Loading training workflow…</p>;
  if (!id) return <TrainingList manufacturer={manufacturer} items={data.items ?? []} />;
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  return manufacturer ? (
    <ManufacturerDetail data={data} base={base} busy={busy} act={act} />
  ) : (
    <CompanyDetail data={data} base={base} busy={busy} act={act} />
  );
}
function TrainingList({
  manufacturer,
  items,
}: {
  manufacturer: boolean;
  items: TrainingData[];
}) {
  return (
    <section className="page-card">
      <h1>{manufacturer ? "Training review queue" : "Training setup"}</h1>
      {items.length === 0 ? (
        <p>No training requests.</p>
      ) : (
        items.map((x) => (
          <article className="card" key={x.id}>
            <p className="eyebrow">{x.status?.replaceAll("_", " ")}</p>
            <h2>{x.specification?.taskName ?? x.robotModel}</h2>
            <p>
              {manufacturer ? x.company : x.manufacturer} · {x.robotModel} · Tier{" "}
              {x.requiredTier ?? "pending"}
            </p>
            <button
              onClick={() =>
                go(
                  `/${manufacturer ? "manufacturer/training-requests" : "company/training-setup"}/${x.id}`,
                )
              }
            >
              {manufacturer ? "Review request" : "View training requirements"}
            </button>
          </article>
        ))
      )}
    </section>
  );
}
function CompanyDetail({
  data,
  base,
  busy,
  act,
}: {
  data: TrainingData;
  base: string;
  busy: boolean;
  act: (f: () => Promise<unknown>) => Promise<void>;
}) {
  const spec = data.specification ?? {},
    [ready, setReady] = useState<Record<string, boolean>>(
      data.readiness?.checklist ?? {},
    ),
    [capture, setCapture] = useState<Capture | null>(null),
    [uploadStatus, setUploadStatus] = useState("");
  const done = checks.filter((x) => ready[x]).length,
    total = useMemo(
      () =>
        data.kit?.reduce(
          (n: number, x: KitItem) => n + (x.referencePriceCents ?? 0),
          0,
        ) ?? 0,
      [data.kit],
    );
  async function readiness() {
    await act(() =>
      api.put(`${base}/${data.id}/readiness`, {
        checklist: ready,
        calibrationComplete: !!ready["Devices calibrated"],
        synchronizationComplete: !!ready["Timestamps synchronized"],
        testRecordingComplete: !!ready["Test recording completed"],
      }),
    );
  }
  async function record(action: string, details: Details = {}) {
    const result = await api.post<Capture>(`${base}/${data.id}/capture`, {
      action,
      kind: data.status === "SAMPLE_REQUIRED" ? "SAMPLE" : "FULL",
      sessionId: capture?.id,
      details,
    });
    setCapture(result);
  }
  async function submission(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      files = f
        .getAll("files")
        .filter((x): x is File => x instanceof File && x.size > 0);
    setUploadStatus("Creating private upload version…");
    await act(async () => {
      const sub = await api.post<{ id: string }>(`${base}/${data.id}/submissions`, {
        kind: f.get("kind"),
        recordingDurationSeconds: Number(f.get("duration")),
        metadata: {
          deviceMetadata: f.get("devices"),
          timestampSynchronization: !!ready["Timestamps synchronized"],
          calibrationStatus: !!ready["Devices calibrated"],
        },
        parentSubmissionId: f.get("parent") || undefined,
      });
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        setUploadStatus(`Uploading ${i + 1}/${files.length}: ${file.name}`);
        const intent = await api.post<UploadIntent>(
          "/api/v1/storage/uploads",
          {
            organizationId: base.split("/")[4],
            purpose: "training_data",
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          },
          { "Idempotency-Key": crypto.randomUUID() },
        );
        const put = await fetch(intent.upload.url, {
          method: "PUT",
          headers: intent.upload.headers,
          body: file,
        });
        if (!put.ok)
          throw new Error(`Upload failed for ${file.name}. Retry this version.`);
        await api.post(
          `/api/v1/organizations/${base.split("/")[4]}/company/training-submissions/${sub.id}/files`,
          {
            objectId: intent.id,
            streamType: formText(f, "streamType") || "video",
            required: true,
            metadata: {
              filename: file.name,
              contentType: file.type,
              sizeBytes: file.size,
            },
          },
        );
      }
      setUploadStatus(
        files.length
          ? "Upload complete. Security validation is processing; submit when files show VALID."
          : "Draft version created.",
      );
    });
  }
  return (
    <section className="page-card">
      <p className="eyebrow">{data.status?.replaceAll("_", " ")}</p>
      <h1>
        {data.status === "TRAINING_DATA_APPROVED"
          ? "Training requirement complete"
          : "Training data required"}
      </h1>
      <p>
        <strong>{data.manufacturer}</strong> requires human demonstration data for{" "}
        {data.robotModel}. Approval means the Manufacturer accepted the dataset; it does
        not claim the robot has learned the task.
      </p>
      <h2>Manufacturer requirements</h2>
      <p>
        <strong>{spec.taskName}</strong> — {spec.taskDescription}
      </p>
      <p>{spec.demonstrationInstructions}</p>
      <dl>
        <dt>Tier</dt>
        <dd>{data.required_tier}</dd>
        <dt>Demonstrations</dt>
        <dd>{spec.numberOfDemonstrations}</dd>
        <dt>Target duration</dt>
        <dd>{spec.targetRecordingDurationSeconds} seconds</dd>
        <dt>Safety</dt>
        <dd>{spec.safetyRequirements}</dd>
        <dt>Privacy</dt>
        <dd>{spec.privacyRequirements}</dd>
      </dl>
      <h2>Recommended Tier {data.required_tier} kit</h2>
      <p>
        RoboWorkPool recommends compatible equipment. Purchases happen directly with
        each independent seller; RoboWorkPool never charges or receives seller funds.
      </p>
      {data.kit?.map((x: KitItem) => (
        <article className="card" key={x.productId}>
          <h3>{x.name}</h3>
          <p>
            {x.requirementStatus} · Tier {x.tier} · {x.purpose}
          </p>
          <p>{x.compatibility}</p>
          <p>
            {x.priceLabel ??
              (x.referencePriceCents
                ? `$${(x.referencePriceCents / 100).toFixed(2)}`
                : "Contact seller")}{" "}
            · Seller: {x.seller}
            {x.subscriptionRequired ? " · Subscription required" : ""}
          </p>
          <a href={x.purchaseUrl} target="_blank" rel="noopener noreferrer">
            Purchase from {x.seller}
          </a>
          <div>
            <button
              disabled={busy}
              onClick={() =>
                void act(() =>
                  api.post(`${base}/${data.id}/equipment`, {
                    productId: x.productId,
                    acquisitionStatus: "PURCHASED",
                    details: { source: "third_party" },
                  }),
                )
              }
            >
              I purchased this
            </button>{" "}
            <button
              disabled={busy}
              onClick={() =>
                void act(() =>
                  api.post(`${base}/${data.id}/equipment`, {
                    productId: x.productId,
                    acquisitionStatus: "ALREADY_OWNED",
                    details: {},
                  }),
                )
              }
            >
              I already own compatible equipment
            </button>{" "}
            <button
              disabled={busy}
              onClick={() =>
                void act(() =>
                  api.post(`${base}/${data.id}/equipment`, {
                    productId: x.productId,
                    acquisitionStatus: "ALTERNATIVE_REQUESTED",
                    details: {},
                  }),
                )
              }
            >
              I need a different compatible option
            </button>
          </div>
        </article>
      ))}
      <p>
        <strong>Estimated complete kit: ${(total / 100).toFixed(2)}</strong>
      </p>
      <h2>
        Equipment readiness — {done}/{checks.length} ready
      </h2>
      {checks.map((x) => (
        <label className="check" key={x}>
          <input
            type="checkbox"
            checked={!!ready[x]}
            onChange={(e) => setReady({ ...ready, [x]: e.target.checked })}
          />
          {x}
        </label>
      ))}
      <button disabled={busy} onClick={() => void readiness()}>
        Save setup progress
      </button>
      <h2>Guided recording</h2>
      <p>{spec.demonstrationInstructions}</p>
      <p>
        Required equipment and recording indicators must remain visible. Stop safely if
        a privacy or equipment problem occurs.
      </p>
      {!capture ? (
        <button onClick={() => void record("START")}>Begin Training Session</button>
      ) : (
        <div>
          <p role="status">Session: {capture.status}</p>
          <button onClick={() => void record("PAUSE")}>Pause</button>{" "}
          <button onClick={() => void record("RESUME")}>Resume</button>{" "}
          <button onClick={() => void record("END")}>End</button>{" "}
          <button onClick={() => void record("EQUIPMENT_PROBLEM", { reported: true })}>
            Report equipment problem
          </button>{" "}
          <button onClick={() => void record("PRIVACY_ISSUE", { reported: true })}>
            Report privacy issue
          </button>{" "}
          <button onClick={() => void record("CANCEL")}>Cancel safely</button>
        </div>
      )}
      <h2>Private submission</h2>
      <p>
        Files are uploaded through RoboWorkPool to private storage. Upload progress,
        retry, validation, and resumable multipart transfer depend on the configured
        storage provider.
      </p>
      <form onSubmit={(e) => void submission(e)}>
        <label>
          Submission type
          <select name="kind">
            <option>SAMPLE</option>
            <option>FULL</option>
            <option>REVISION</option>
          </select>
        </label>
        <Field name="duration" label="Recording duration (seconds)" type="number" />
        <Field name="devices" label="Device metadata" />
        <Field name="streamType" label="Data stream type" />
        <label>
          Training files
          <input name="files" type="file" multiple />
        </label>
        <Field name="parent" label="Prior submission ID (revision only)" />
        <button>Create and upload private version</button>
      </form>
      {uploadStatus && <p role="status">{uploadStatus}</p>}
      <h2>Version history</h2>
      {data.submissions?.map((s: Submission) => (
        <article className="card" key={s.id}>
          <strong>
            Version {s.version} · {s.kind} · {s.status}
          </strong>
          <p>
            {s.recording_duration_seconds} seconds · {s.files?.length ?? 0} files
          </p>
          {s.status === "DRAFT" && (
            <button
              onClick={() =>
                void act(() =>
                  api.post(
                    `/api/v1/organizations/${base.split("/")[4]}/company/training-submissions/${s.id}/submit`,
                  ),
                )
              }
            >
              Submit validated files for Manufacturer review
            </button>
          )}
        </article>
      ))}
      <h2>Manufacturer feedback</h2>
      {data.reviews?.length ? (
        data.reviews.map((r: Review) => (
          <article className="card" key={r.id}>
            <strong>
              Version {r.submission_version}: {r.decision}
            </strong>
            <p>{r.comments}</p>
            <p>
              Accepted: {r.accepted_streams?.join(", ") || "None"} · Redo:{" "}
              {r.redo_streams?.join(", ") || "None"} · Additional recordings:{" "}
              {r.additional_recordings}
            </p>
          </article>
        ))
      ) : (
        <p>No Manufacturer feedback yet.</p>
      )}
      {errorMessage(null)}
    </section>
  );
}
function ManufacturerDetail({
  data,
  base,
  busy,
  act,
}: {
  data: TrainingData;
  base: string;
  busy: boolean;
  act: (f: () => Promise<unknown>) => Promise<void>;
}) {
  async function decision(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      required = f.get("decision") === "TRAINING_DATA_REQUIRED";
    const specification = {
      taskName: f.get("taskName"),
      taskDescription: f.get("taskDescription"),
      demonstrationInstructions: f.get("instructions"),
      numberOfDemonstrations: Number(f.get("demos") || 1),
      targetRecordingDurationSeconds: Number(f.get("duration") || 60),
      requiredFirstPersonVideo: f.get("fpv") === "on",
      requiredThirdPersonVideo: f.get("tpv") === "on",
      requiredWristArmMovement: f.get("wrist") === "on",
      requiredHandFingerMotion: f.get("hands") === "on",
      requiredFullBodyMotion: f.get("body") === "on",
      requiredAudio: f.get("audio") === "on",
      requiredImu: f.get("imu") === "on",
      otherRequiredStreams: [],
      cameraResolution: f.get("resolution") || undefined,
      frameRate: Number(f.get("fps")) || undefined,
      fileTypes: formText(f, "files").split(",").filter(Boolean),
      exportFormat: f.get("format") || undefined,
      synchronization: f.get("sync") || undefined,
      calibrationInstructions: f.get("calibration") || undefined,
      workEnvironment: f.get("environment"),
      objectsTools: formText(f, "tools").split(",").filter(Boolean),
      viewpoints: formText(f, "viewpoints").split(",").filter(Boolean),
      successExamples: [],
      failureExamples: [],
      safetyRequirements: f.get("safety"),
      privacyRequirements: f.get("privacy"),
      maximumFileSizeBytes: Number(f.get("max") || 5000000000),
      manufacturerNotes: f.get("notes") || undefined,
    };
    await act(() =>
      api.post(
        `${base}/${data.id}/decision`,
        required
          ? {
              decision: "TRAINING_DATA_REQUIRED",
              requiredTier: Number(f.get("tier")),
              specification,
            }
          : { decision: "NO_NEW_TRAINING_DATA_REQUIRED" },
      ),
    );
  }
  async function review(s: Submission, decision: string) {
    await act(() =>
      api.post(
        `/api/v1/organizations/${base.split("/")[4]}/manufacturer/training-submissions/${s.id}/review`,
        {
          decision,
          acceptedStreams: [],
          redoStreams: decision === "APPROVED" ? [] : ["needs_review"],
          additionalRecordings: decision === "APPROVED" ? 0 : 1,
          feedback: { reason: "Structured review recorded" },
          comments:
            decision === "APPROVED"
              ? "Accepted"
              : "Please address the requested camera angle, visibility, synchronization, or calibration issue.",
        },
      ),
    );
  }
  return (
    <section className="page-card">
      <p className="eyebrow">{data.status?.replaceAll("_", " ")}</p>
      <h1>Manufacturer training request</h1>
      <p>
        {data.company} · {data.robotModel}
      </p>
      {data.decision === "PENDING_MANUFACTURER_REVIEW" ? (
        <form onSubmit={(e) => void decision(e)}>
          <label>
            Decision
            <select name="decision">
              <option>TRAINING_DATA_REQUIRED</option>
              <option>NO_NEW_TRAINING_DATA_REQUIRED</option>
            </select>
          </label>
          <Field name="taskName" label="Task name" />
          <Field name="taskDescription" label="Task description" />
          <Field name="instructions" label="Demonstration instructions" />
          <Field name="demos" label="Number of demonstrations" type="number" />
          <Field name="duration" label="Target duration (seconds)" type="number" />
          <label>
            Required tier
            <select name="tier">
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </label>
          <label className="check">
            <input name="fpv" type="checkbox" />
            First-person video
          </label>
          <label className="check">
            <input name="tpv" type="checkbox" />
            Third-person video
          </label>
          <label className="check">
            <input name="wrist" type="checkbox" />
            Wrist/arm movement
          </label>
          <label className="check">
            <input name="hands" type="checkbox" />
            Hand/finger motion
          </label>
          <label className="check">
            <input name="body" type="checkbox" />
            Full-body motion
          </label>
          <label className="check">
            <input name="audio" type="checkbox" />
            Audio
          </label>
          <label className="check">
            <input name="imu" type="checkbox" />
            IMU
          </label>
          <Field name="resolution" label="Camera resolution" />
          <Field name="fps" label="Frame rate" type="number" />
          <Field name="files" label="File types (comma-separated)" />
          <Field name="format" label="Export format" />
          <Field name="sync" label="Synchronization requirements" />
          <Field name="calibration" label="Calibration instructions" />
          <Field name="environment" label="Work environment" />
          <Field name="tools" label="Objects/tools" />
          <Field name="viewpoints" label="Required viewpoints" />
          <Field name="safety" label="Safety requirements" />
          <Field name="privacy" label="Privacy requirements" />
          <Field name="max" label="Maximum upload bytes" type="number" />
          <Field name="notes" label="Manufacturer notes" />
          <button disabled={busy}>Save requirement decision</button>
        </form>
      ) : (
        <>
          <h2>{data.specification?.taskName}</h2>
          <p>{data.specification?.taskDescription}</p>
        </>
      )}
      <h2>Private submission review</h2>
      {data.submissions?.length ? (
        data.submissions.map((s: Submission) => (
          <article className="card" key={s.id}>
            <h3>
              Version {s.version} · {s.kind}
            </h3>
            <p>
              {s.status} · {s.recording_duration_seconds} seconds
            </p>
            <ul>
              {s.files?.map((f: TrainingFile) => (
                <li key={f.id}>
                  {f.streamType} — {f.validationStatus}{" "}
                  {f.validationStatus === "VALID" && (
                    <button
                      onClick={() =>
                        void api
                          .get<{ url: string }>(
                            `/api/v1/organizations/${base.split("/")[4]}/training-files/${f.id}/download`,
                          )
                          .then((x) =>
                            window.open(x.url, "_blank", "noopener,noreferrer"),
                          )
                      }
                    >
                      Securely open
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button
              disabled={busy || s.status !== "AWAITING_REVIEW"}
              onClick={() => void review(s, "APPROVED")}
            >
              Approve {s.kind === "SAMPLE" ? "Setup" : "Training Data"}
            </button>{" "}
            <button
              disabled={busy || s.status !== "AWAITING_REVIEW"}
              onClick={() => void review(s, "CHANGES_REQUESTED")}
            >
              Request Changes
            </button>{" "}
            <button
              disabled={busy || s.status !== "AWAITING_REVIEW"}
              onClick={() => void review(s, "PARTIALLY_ACCEPTED")}
            >
              Partially Accept
            </button>{" "}
            <button
              disabled={busy || s.status !== "AWAITING_REVIEW"}
              onClick={() => void review(s, "REJECTED")}
            >
              Reject
            </button>
          </article>
        ))
      ) : (
        <p>No submissions awaiting review.</p>
      )}
    </section>
  );
}
function errorMessage(value: string | null) {
  return value ? <p role="alert">{value}</p> : null;
}
