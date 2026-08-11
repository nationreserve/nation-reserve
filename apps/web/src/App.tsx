import type {
  DependencyHealthState,
  HealthResponse,
  ReadinessResponse,
} from "@nation-reserve/types";
import { useCallback, useEffect, useState } from "react";

type ViewState =
  | { kind: "loading" }
  | {
      kind: "loaded";
      health: HealthResponse;
      readiness: ReadinessResponse;
    }
  | { kind: "unavailable"; message: string };

const configuredApiBaseUrl: unknown = import.meta.env["VITE_API_BASE_URL"];
const apiBaseUrl =
  typeof configuredApiBaseUrl === "string" ? configuredApiBaseUrl : "/api";

async function readJson<T>(path: string): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });
  const body = (await response.json()) as T;
  return { response, body };
}

function DependencyRow({
  label,
  state,
}: {
  label: string;
  state: DependencyHealthState;
}) {
  return (
    <li>
      <span>{label}</span>
      <span className={`badge badge--${state}`}>{state}</span>
    </li>
  );
}

export function App() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  const loadStatus = useCallback(async () => {
    setView({ kind: "loading" });
    try {
      const [healthResult, readinessResult] = await Promise.all([
        readJson<HealthResponse>("/health"),
        readJson<ReadinessResponse>("/ready"),
      ]);

      if (!healthResult.response.ok) {
        throw new Error("The API health check did not succeed.");
      }

      setView({
        kind: "loaded",
        health: healthResult.body,
        readiness: readinessResult.body,
      });
    } catch {
      setView({
        kind: "unavailable",
        message: "The API is unavailable. Confirm it is running, then try again.",
      });
    }
  }, []);

  useEffect(() => {
    // The first status synchronization intentionally owns the initial state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
  }, [loadStatus]);

  const apiHealthy = view.kind === "loaded";
  const dependenciesReady = view.kind === "loaded" && view.readiness.status === "ready";

  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Nation Reserve</p>
        <h1 id="page-title">RoboWorkPool</h1>
        <p className="intro">
          The platform foundation is running. Business features are intentionally not
          included yet.
        </p>
      </section>

      <section
        className="status-panel"
        aria-live="polite"
        aria-busy={view.kind === "loading"}
      >
        <div className="status-panel__heading">
          <div>
            <p className="eyebrow">Foundation status</p>
            <h2>System checks</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={view.kind === "loading"}
          >
            Retry
          </button>
        </div>

        {view.kind === "loading" && (
          <p className="state-message">Checking services...</p>
        )}

        {view.kind === "unavailable" && (
          <div className="state-message state-message--error" role="alert">
            <strong>Unavailable</strong>
            <span>{view.message}</span>
          </div>
        )}

        {view.kind === "loaded" && (
          <>
            <div className="summary-grid">
              <article>
                <span>API</span>
                <strong className={apiHealthy ? "text-success" : "text-danger"}>
                  {apiHealthy ? "Healthy" : "Unavailable"}
                </strong>
              </article>
              <article>
                <span>Dependencies</span>
                <strong className={dependenciesReady ? "text-success" : "text-warning"}>
                  {dependenciesReady ? "Ready" : "Degraded"}
                </strong>
              </article>
            </div>

            <ul className="dependency-list" aria-label="Dependency health">
              <DependencyRow
                label="PostgreSQL"
                state={view.readiness.dependencies.postgres}
              />
              <DependencyRow label="Redis" state={view.readiness.dependencies.redis} />
              <DependencyRow
                label="Object storage"
                state={view.readiness.dependencies.objectStorage}
              />
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
