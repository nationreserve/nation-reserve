import {useEffect,useState,type FormEvent} from "react";
import {AuthenticatedShell} from "@nation-reserve/application-shell";
import {Alert,PageHeader} from "@nation-reserve/design-system";
import {api} from "./auth-client.js";

type Payment={id:string;user_id:string;purpose:string;status:string;amount_cents:number;refunded_cents:number;created_at:string};
type Refund={id:string;funding_payment_id:string;status:string;amount_cents:number;reason:string;created_at:string};
type Dispute={id:string;funding_payment_id:string;status:string;amount_cents:number;reason?:string;created_at:string};
type Ledger={transaction_type:string;status:string;count:number;amount_cents:number};
type Reconciliation={id:string;stripe_transaction_id:string;status:string;difference_cents:number;created_at:string};
type Finance={payments:Payment[];refunds:Refund[];disputes:Dispute[];ledger:Ledger[];reconciliation:Reconciliation[]};
const formText=(form:FormData,name:string)=>{const value=form.get(name);return typeof value==="string"?value:""};
const money=(cents:number|string)=>Number(cents).toLocaleString(undefined,{style:"currency",currency:"USD",minimumFractionDigits:2});

export function FinanceAdmin(){
 const[data,setData]=useState<Finance>();const[message,setMessage]=useState("");const[busy,setBusy]=useState(false);
 const load=()=>api.get<Finance>("/api/v1/platform/funding-finance").then(setData).catch(e=>setMessage(e instanceof Error?e.message:"Finance data could not be loaded."));
 useEffect(()=>{void load()},[]);
 async function reconcile(){setBusy(true);try{const run=await api.post<{status:string;exception_count:number}>("/api/v1/platform/funding-reconciliation-runs");setMessage(`Reconciliation ${run.status}; ${run.exception_count??0} exception(s) require review.`);await load();}catch(e){setMessage(e instanceof Error?e.message:"Reconciliation failed.");}finally{setBusy(false)}}
 async function refund(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);setBusy(true);try{await api.post(`/api/v1/platform/robot-funding-payments/${formText(d,"paymentId")}/refunds`,{amountCents:Math.round(Number(d.get("amount"))*100),reason:formText(d,"reason")},{"Idempotency-Key":crypto.randomUUID()});form.reset();setMessage("Refund requested. Balances remain reserved until Stripe sends the authoritative result.");await load();}catch(error){setMessage(error instanceof Error?error.message:"Refund request failed.");}finally{setBusy(false)}}
 return <AuthenticatedShell breadcrumbs={[{label:"Platform",href:"/platform"},{label:"Finance Operations"}]}><main><PageHeader eyebrow="Operations" title="Funding finance" description="Review Stripe funding, refunds, disputes, ledger totals, and reconciliation exceptions."/>
 <Alert tone="info" title="Authoritative settlement">Browser responses never settle balances. Signed Stripe webhooks update the immutable ledger; disputes flag ownership for review and do not silently delete it.</Alert>
 <section><h2>Controls</h2><button disabled={busy} onClick={()=>void reconcile()}>Run Stripe reconciliation</button><form onSubmit={e=>void refund(e)}><h3>Issue downpayment refund</h3><label>Settled funding payment<select name="paymentId" required><option value="">Select payment</option>{data?.payments.filter(p=>p.purpose==="DOWNPAYMENT"&&["SUCCEEDED","PARTIALLY_REFUNDED"].includes(p.status)).map(p=><option key={p.id} value={p.id}>{p.id} · {money(Number(p.amount_cents)-Number(p.refunded_cents))} refundable</option>)}</select></label><label>Amount (USD)<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Reason<textarea name="reason" minLength={10} maxLength={1000} required/></label><button disabled={busy}>Request refund</button></form></section>
 <section><h2>Ledger summary</h2>{data?.ledger.map(x=><article key={`${x.transaction_type}:${x.status}`}><strong>{x.transaction_type.replaceAll("_"," ")}</strong> · {x.status} · {x.count} · {money(x.amount_cents)}</article>)}</section>
 <section><h2>Funding payments</h2>{data?.payments.map(x=><article className="nr-card" key={x.id}><strong>{x.purpose.replaceAll("_"," ")} · {money(x.amount_cents)}</strong><p>{x.status} · refunded {money(x.refunded_cents)} · <time>{new Date(x.created_at).toLocaleString()}</time></p><small>{x.id}</small></article>)}</section>
 <section><h2>Refunds</h2>{data?.refunds.length?data.refunds.map(x=><article key={x.id}><strong>{money(x.amount_cents)} · {x.status}</strong><p>{x.reason}</p></article>):<p>No refund records.</p>}</section>
 <section><h2>Disputes requiring review</h2>{data?.disputes.length?data.disputes.map(x=><article className="nr-card" key={x.id}><strong>{money(x.amount_cents)} · {x.status}</strong><p>{x.reason??"No processor reason supplied"}</p><small>Funding payment {x.funding_payment_id}</small></article>):<p>No disputes.</p>}</section>
 <section><h2>Reconciliation exceptions</h2>{data?.reconciliation.length?data.reconciliation.map(x=><article key={x.id}><strong>{x.status}</strong> · difference {money(x.difference_cents)} · <small>{x.stripe_transaction_id}</small></article>):<p>No reconciliation items.</p>}</section>{message&&<p role="status">{message}</p>}</main></AuthenticatedShell>;
}
