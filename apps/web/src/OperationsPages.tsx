/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useEffect,useState } from "react";
import { api } from "./auth-client.js";

export function OperationsPage({path}:{path:string}){
  const [data,setData]=useState<unknown>();const organizationId=sessionStorage.getItem("currentOrganizationId");
  useEffect(()=>{const endpoint=endpointFor(path,organizationId);if(endpoint)
    void api.get(endpoint).then(setData).catch((error:unknown)=>setData({
      error:error instanceof Error?error.message:"Unable to load"}));},[path,organizationId]);
  const owner=path.startsWith("/owner");const manufacturer=path.startsWith("/manufacturer");
  const company=path.startsWith("/company");
  return <main className="app-shell"><p className="eyebrow">Nation Reserve · RoboWorkPool</p>
    <section className="page-card"><h1>{owner?"Owner operations":manufacturer?
      "Manufacturer heartbeat diagnostics":company?"Company robot operations":"Platform operations"}</h1>
      <p>Verified operating time is evidence-backed operational time. It is not paid earnings.</p>
      <div className="summary-grid"><article><span>Online</span><strong>{count(data,"online")}</strong></article>
        <article><span>Degraded</span><strong>{count(data,"degraded")}</strong></article>
        <article><span>Offline</span><strong>{count(data,"offline")}</strong></article></div>
      {company&&<form aria-label="Report inactive robot"><h2>Report assigned robot inactive</h2>
        <label>Reason<select><option>Robot not present</option><option>Robot powered off</option>
          <option>Network connected but inactive</option></select></label>
        <label>Notes<textarea /></label><button type="submit">Submit for evidence review</button>
        <p>This report starts a review; it does not erase verified time.</p></form>}
      <h2>Evidence timeline</h2><pre>{redact(data)}</pre>
    </section></main>;
}
function endpointFor(path:string,organizationId:string|null){
  if(path.startsWith("/platform"))return "/api/v1/platform/heartbeat/overview";
  if(!organizationId)return undefined;
  if(path.startsWith("/manufacturer"))return `/api/v1/organizations/${organizationId}/manufacturer/heartbeat-overview`;
  if(path.startsWith("/company"))return `/api/v1/organizations/${organizationId}/assignments/operational-status`;
  const robotId=path.match(/robots\/([0-9a-f-]+)/)?.[1];return robotId?
    `/api/v1/organizations/${organizationId}/robots/${robotId}/heartbeat-status`:undefined;
}
function count(data:unknown,state:string){
  if(!data||typeof data!=="object"||!("items" in data)||!Array.isArray(data.items))return 0;
  return data.items.filter((item:unknown)=>item&&typeof item==="object"&&
    "heartbeat_state" in item&&item.heartbeat_state===state).length;
}
function redact(data:unknown){return JSON.stringify(data??{},(key,value)=>
  /secret|signature|encrypted|public_key/i.test(key)?"[redacted]":value,2);}