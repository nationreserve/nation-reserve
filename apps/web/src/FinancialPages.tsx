import {useEffect,useState} from "react";import {api} from "./auth-client.js";
import {DataView} from "./DataView.js";
export function FinancialPage({path}:{path:string}){const[data,setData]=useState<unknown>();
  const organizationId=sessionStorage.getItem("currentOrganizationId"),platform=path.startsWith("/platform");
  useEffect(()=>{const endpoint=route(path,organizationId);if(endpoint)void api.get(endpoint).then(setData)
    .catch((error:unknown)=>setData({error:error instanceof Error?error.message:"Unable to load"}));},
  [path,organizationId]);
  const owner=path.startsWith("/owner");return <main className="app-shell"><p className="eyebrow">
    Nation Reserve · RoboWorkPool</p><section className="page-card"><h1>{platform?"Financial operations":
    owner?"Owner earnings":"Company billing"}</h1><p>{owner?
      "Gross earnings, platform fee, net earnings, and held amounts are shown separately.":
      "Accrued and invoiced amounts do not mean an external payment was collected."}</p>
    {platform&&<aside className="notice"><strong>External payment execution is not connected.</strong>
      <p>Settlement batches can be prepared and approved for future submission only.</p></aside>}
    <div className="summary-grid"><article><span>Gross</span><strong>{money(data,"gross_minor_units")}</strong></article>
      <article><span>Platform fee</span><strong>{money(data,"platform_fee_minor_units")}</strong></article>
      <article><span>Net</span><strong>{money(data,"net_minor_units")}</strong></article>
      <article><span>Held</span><strong>{money(data,"held_minor_units")}</strong></article></div>
    <h2>{path.includes("journal")?"Journal entries":path.includes("reconciliation")?
      "Reconciliation exceptions":path.includes("settlement")?"Settlement preparation":"Financial records"}</h2>
    <DataView data={data??{}}/></section></main>;}
function route(path:string,organizationId:string|null){if(path.startsWith("/platform")){
  if(path.includes("journal"))return"/api/v1/platform/journal-entries";
  if(path.includes("reconciliation"))return"/api/v1/platform/reconciliation-runs";
  if(path.includes("settlement"))return"/api/v1/platform/settlement-batches";
  return"/api/v1/platform/financial/overview";}if(!organizationId)return undefined;
  if(path.startsWith("/owner"))return`/api/v1/organizations/${organizationId}/earnings/summary`;
  return`/api/v1/organizations/${organizationId}/billing/summary`;}
function money(data:unknown,key:string){if(!data||typeof data!=="object"||!(key in data))return"$0.00";
  const value=(data as Record<string,unknown>)[key];const cents=typeof value==="number"?value:
    typeof value==="string"?Number(value):0;return`$${(cents/100).toFixed(2)}`;}
