import type { ReactNode } from "react";

function value(input: unknown): ReactNode {
  if (input === null || input === undefined || input === "") return "Not available";
  if (typeof input === "boolean") return input ? "Yes" : "No";
  if (typeof input === "string" || typeof input === "number") return String(input);
  if (Array.isArray(input)) return input.length ? <ul>{input.map((item,index)=><li key={index}>{value(item)}</li>)}</ul> : "None";
  if (typeof input === "object") return <DataView data={input}/>;
  return "Not available";
}

export function DataView({data}:{data:unknown}) {
  if (Array.isArray(data)) return data.length ? <div className="account-records">{data.map((item,index)=><article className="nr-card" key={index}>{value(item)}</article>)}</div> : <p>No records.</p>;
  if (!data || typeof data !== "object") return <p>{value(data)}</p>;
  return <dl className="data-view">{Object.entries(data as Record<string,unknown>).map(([key,item])=><div key={key}><dt>{key.replaceAll("_"," ").replaceAll(/\b\w/g,c=>c.toUpperCase())}</dt><dd>{value(item)}</dd></div>)}</dl>;
}
