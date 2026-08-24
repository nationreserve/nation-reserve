import {Buffer} from "node:buffer";
import pg from "npm:pg@8.16.3";
import {PostgresPaymentService} from "../../../apps/api/src/postgres-payment-service.ts";
import {StripeWebhookVerificationError,verifyStripeWebhook} from "../../../packages/payments/src/stripe-webhook-verifier.ts";
import type {PaymentConfig,PaymentProvider} from "@nation-reserve/payments";
const required=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`STRIPE_WEBHOOK_CONFIG_MISSING:${name}`);return value};
const providerName=required("PAYMENT_PROVIDER");if(providerName!=="stripe")throw new Error("STRIPE_WEBHOOK_PROVIDER_MUST_BE_STRIPE");
const providerEnvironment=required("PAYMENT_PROVIDER_ENVIRONMENT");if(providerEnvironment!=="test"&&providerEnvironment!=="live")throw new Error("STRIPE_WEBHOOK_ENVIRONMENT_INVALID");
const pool=new pg.Pool({connectionString:required("DATABASE_URL"),max:1,allowExitOnIdle:true,statement_timeout:120000,application_name:"roboworkpool-stripe-webhook"});
const platformSecret=required("PAYMENT_PROVIDER_WEBHOOK_SECRET"),connectSecret=required("PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET");
const json=(status:number,body:Record<string,unknown>)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
export default{async fetch(request:Request):Promise<Response>{
 if(request.method!=="POST")return json(405,{code:"METHOD_NOT_ALLOWED"});
 const signature=request.headers.get("stripe-signature");if(!signature)return json(400,{code:"PAYMENT_WEBHOOK_SIGNATURE_REQUIRED"});
 let rawBody:Uint8Array;try{rawBody=new Uint8Array(await request.arrayBuffer())}catch{return json(400,{code:"PAYMENT_WEBHOOK_BODY_REQUIRED"})}if(!rawBody.byteLength)return json(400,{code:"PAYMENT_WEBHOOK_BODY_REQUIRED"});
 try{const event=await verifyStripeWebhook({rawBody,signature,platformSecret,connectSecret,expectedEnvironment:providerEnvironment});
  const provider={name:"stripe",environment:providerEnvironment,verifyWebhook:async()=>event}as unknown as PaymentProvider;
  const config={PAYMENT_PROVIDER:"stripe",PAYMENT_PROVIDER_ENVIRONMENT:providerEnvironment,PAYMENT_EXECUTION_ENABLED:false}as PaymentConfig;
  const result=await new PostgresPaymentService(pool,provider,config).processWebhook(Buffer.from(rawBody),signature);return json(200,result);
 }catch(error){if(error instanceof StripeWebhookVerificationError)return json(error.statusCode,{code:error.code});const candidate=error as{statusCode?:number;code?:string};if(candidate.statusCode&&candidate.statusCode<500)return json(candidate.statusCode,{code:candidate.code??"PAYMENT_WEBHOOK_REJECTED"});console.error("Stripe webhook processing failed",candidate.code??"PAYMENT_WEBHOOK_PROCESSING_FAILED");return json(500,{code:"PAYMENT_WEBHOOK_PROCESSING_FAILED"});}
}};
