import { useEffect, useState } from "react";
import {DataView} from "./DataView.js";
import { api } from "./auth-client.js";

const stateDimensions = ["registration_state","ownership_state","activation_state","heartbeat_state",
  "operational_state","maintenance_state","compliance_state","financial_eligibility_state",
  "final_lifecycle_state"];
export function IntegrationPage({ path }: { path: string }) {
  const [data, setData] = useState<unknown>();
  const title = path.startsWith("/manufacturer") ? "Manufacturer integration"
    : path.startsWith("/owner") ? "Robot Owner fleet" : "Platform review";
  useEffect(() => {
    const endpoint = endpointFor(path);
    if (endpoint) void api.get(endpoint).then(setData).catch((error: unknown) =>
      setData({ error: error instanceof Error ? error.message : "Unable to load" }));
  }, [path]);
  return <main className="app-shell"><p className="eyebrow">Nation Reserve · RoboWorkPool</p>
    <section className="page-card"><h1>{title}</h1><p>{description(path)}</p>
      {path.includes("/credentials") && <aside className="state-message">
        Secrets appear once at creation. Copy them now; RoboWorkPool never displays them again.
      </aside>}
      {path.includes("/activation") && <ul className="checklist">
        {["Registered","Owner verified","Manufacturer approved","Model approved","Firmware supported",
          "Hardware identity confirmed","Integration connectivity","Operational mapping",
          "Region permitted","Compliance eligible"].map((check) => <li key={check}>{check} <b>pending</b></li>)}
      </ul>}
      {path.match(/\/robots\/[^/]+$/) && <div className="state-grid">
        {stateDimensions.map((state) => <article key={state}><span>{state.replaceAll("_"," ")}</span>
          <strong>{readState(data,state)}</strong></article>)}</div>}
      {data !== undefined && <DataView data={data}/>}
    </section></main>;
}
function endpointFor(path: string): string | undefined {
  const organizationId = sessionStorage.getItem("currentOrganizationId");
  if (path === "/manufacturer/application" && organizationId)
    return `/api/v1/organizations/${organizationId}/manufacturer/application`;
  if (path === "/manufacturer/credentials" && organizationId)
    return `/api/v1/organizations/${organizationId}/manufacturer/credentials`;
  if (path === "/manufacturer/models" && organizationId)
    return `/api/v1/organizations/${organizationId}/manufacturer/models`;
  if (path === "/manufacturer/robots" && organizationId)
    return `/api/v1/organizations/${organizationId}/manufacturer/robots`;
  if (path === "/platform/manufacturers/applications") return "/api/v1/platform/manufacturers/applications";
  if (path === "/platform/robot-models") return "/api/v1/platform/robot-models";
  if (path === "/platform/robot-registrations") return "/api/v1/platform/robot-registrations";
  if (path === "/platform/ownership-claims") return "/api/v1/platform/ownership-claims";
  if (path === "/platform/activations") return "/api/v1/platform/activations";
  const robot = path.match(/\/robots\/([0-9a-f-]+)$/)?.[1];
  return robot ? `/api/v1/robots/${robot}` : undefined;
}
function description(path: string) {
  if (path.includes("application")) return "Complete business and integration review information.";
  if (path.includes("credentials")) return "Manage separate sandbox and production credentials.";
  if (path.includes("models")) return "Submit model revisions and test operational-state mappings.";
  if (path.includes("activation")) return "Activation proves readiness only. It creates no work or pay.";
  if (path.includes("robots/add")) return "Claim a manufacturer-registered robot using its one-time transfer code.";
  return "Review registered robot identity, ownership, and activation without fabricated metrics.";
}
function readState(data: unknown,key:string) {
  return data && typeof data==="object" && key in data ? String((data as Record<string,unknown>)[key]) : "not loaded";
}

