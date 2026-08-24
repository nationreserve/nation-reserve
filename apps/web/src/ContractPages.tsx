import { useEffect,useState } from "react";
import {DataView} from "./DataView.js";
import { api } from "./auth-client.js";

export function ContractPage({path}:{path:string}){
  const [data,setData]=useState<unknown>();
  const organizationId=sessionStorage.getItem("currentOrganizationId");
  const manufacturer=path.startsWith("/manufacturer");
  const title=manufacturer?"Manufacturer contracts":"Hiring Company contracts";
  useEffect(()=>{
    if(!organizationId)return;
    const endpoint=endpointFor(path,organizationId,manufacturer);
    if(endpoint)void api.get(endpoint).then(setData).catch((e:unknown)=>
      setData({error:e instanceof Error?e.message:"Unable to load"}));
  },[path,organizationId,manufacturer]);
  return <main className="app-shell"><p className="eyebrow">Nation Reserve · RoboWorkPool</p>
    <section className="page-card"><h1>{title}</h1>
      <p>Contracts establish intended work and robot schedules. They create zero payable time.</p>
      {path.endsWith("/contracts")&&<div className="filter-row">
        {["Drafts","Pending Manufacturer Approval","Pending Company Approval","Approved",
          "Partially Fulfilled","Fully Fulfilled","Cancelled","Completed"].map(label=>
          <button type="button" key={label}>{label}</button>)}</div>}
      {path.includes("/allocation")&&<section><h2>Robot allocation</h2>
        <p>Only activated, owner-verified, available robots matching the approved model can be selected.</p>
        <div className="summary-grid"><article><span>Requested</span><strong>{read(data,"requested_robot_count")}</strong></article>
          <article><span>Allocated</span><strong>{read(data,"assigned_robot_count")}</strong></article>
          <article><span>Remaining</span><strong>{read(data,"remaining_robot_count")}</strong></article></div></section>}
      {path.includes("/assignments/")&&<AssignmentSummary data={data}/>}
      {data!==undefined&&<DataView data={data}/>}
    </section></main>;
}
function endpointFor(path:string,organizationId:string,manufacturer:boolean){
  const side=manufacturer?"manufacturer":"company";
  const contractId=path.match(/\/contracts\/([0-9a-f-]+)/)?.[1];
  if(contractId)return `/api/v1/organizations/${organizationId}/${side}/contracts/${contractId}`;
  const assignmentId=path.match(/\/assignments\/([0-9a-f-]+)/)?.[1];
  if(assignmentId)return `/api/v1/organizations/${organizationId}/assignments/${assignmentId}`;
  return `/api/v1/organizations/${organizationId}/${side}/contracts`;
}
function AssignmentSummary({data}:{data:unknown}){
  const fields=["manufacturer_serial_number","owner_name","facility_name","department_name",
    "status","scheduled_start_at","scheduled_end_at","activation_state","final_lifecycle_state",
    "replacement_for_assignment_id"];
  return <section><h2>Assignment</h2><div className="state-grid">{fields.map(field=>
    <article key={field}><span>{field.replaceAll("_"," ")}</span><strong>{read(data,field)}</strong></article>)}</div></section>;
}
function read(data:unknown,key:string){
  return data&&typeof data==="object"&&key in data?displayValue((data as Record<string,unknown>)[key]):"—";
}


function displayValue(value:unknown){
  if(value===null||value===undefined)return "—";
  if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);
  return JSON.stringify(value);
}