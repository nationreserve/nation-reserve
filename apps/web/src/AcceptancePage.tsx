import { useEffect, useState } from "react";
import { api } from "./auth-client.js";

type Overview = { launch_blockers: number; open_gaps: number; active_waivers: number; last_run: { status: string; started_at: string } | null };
export function AcceptancePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [gaps, setGaps] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([
    api.get<Overview>("/api/v1/platform/acceptance/overview"),
    api.get<{ items: Array<Record<string, unknown>> }>("/api/v1/platform/acceptance/gaps"),
  ]).then(([summary, register]) => { setOverview(summary); setGaps(register.items); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Acceptance evidence could not be loaded.")); }, []);
  return <section className="page-card" aria-labelledby="acceptance-title">
    <h1 id="acceptance-title">Platform acceptance</h1>
    <p>This view is read-only evidence. A route or document alone does not count as a passing requirement.</p>
    {error && <p role="alert">{error} Retry safely or contact Platform Operations with the request ID.</p>}
    {!overview && !error && <p role="status">Loading acceptance evidence…</p>}
    {overview && <><div className="choice-grid">
      <article><strong>{overview.launch_blockers}</strong><span> Launch blockers</span></article>
      <article><strong>{overview.open_gaps}</strong><span> Open gaps</span></article>
      <article><strong>{overview.active_waivers}</strong><span> Active waivers</span></article>
      <article><strong>{overview.last_run?.status ?? "never"}</strong><span> Last execution</span></article>
    </div><h2>Gap register</h2>{gaps.length === 0 ? <p>No persisted gaps are available. This does not mean acceptance passed.</p> :
      <div className="table-wrap"><table><thead><tr><th>ID</th><th>Feature</th><th>Class</th><th>Status</th></tr></thead><tbody>{gaps.map((gap) => <tr key={String(gap.id)}><td>{String(gap.id)}</td><td>{String(gap.feature)}</td><td>{String(gap.classification)}</td><td>{String(gap.status)}</td></tr>)}</tbody></table></div>}</>}
  </section>;
}
