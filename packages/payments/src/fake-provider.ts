/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import{createHmac}from"node:crypto";import type{ProviderResult,VerifiedWebhookEvent}from"./provider.js";
type Mode="success"|"processing"|"requires_action"|"decline"|"timeout"|"provider_error"|"payout_failed"|"refund_failed";
const id=(prefix:string,key:string)=>`${prefix}_${createHmac("sha256","fake").update(key).digest("hex").slice(0,24)}`;
export class FakePaymentProvider{
  readonly name="fake";readonly environment="test"as const;
  constructor(private readonly mode:Mode="success",private readonly webhookSecret="fake-webhook-secret"){}
  async createCompanyCustomer(i:{idempotencyKey:string}){return{id:id("cus",i.idempotencyKey)};}
  async createUserCustomer(i:{idempotencyKey:string}){return{id:id("cus",i.idempotencyKey)};}
  async createPaymentMethodSetup(i:{idempotencyKey:string}){return this.result("seti",i.idempotencyKey);}
  async retrievePaymentMethod(i:{paymentMethodId:string}){return{id:i.paymentMethodId,type:"card"as const,brand:"Visa",last4:"4242",expirationMonth:12,expirationYear:2035};}
  async createOwnerConnectedAccount(i:{idempotencyKey:string}){return{id:id("acct",i.idempotencyKey),status:"active"};}
  async createOwnerOnboardingLink(i:{accountId:string}){return{url:`https://fake.invalid/onboard/${i.accountId}`};}
  async retrieveConnectedAccount(){return{status:"active",detailsSubmitted:true,transfersEnabled:true,payoutsEnabled:true,requirements:[]};}
  async createInvoiceCollection(i:{customerId:string;paymentMethodId:string;amountMinorUnits:number;currency:"USD";idempotencyKey:string}){return this.result("pi",i.idempotencyKey);}
  async createFundingPayment(i:{idempotencyKey:string}){return this.result("pi",i.idempotencyKey);}
  async retrievePayment(i:{providerPaymentId:string}){return{providerObjectId:i.providerPaymentId,status:"succeeded" as const};}
  async createOwnerPayout(i:{accountId:string;amountMinorUnits:number;currency:"USD";idempotencyKey:string}){return this.result("po",i.idempotencyKey,this.mode==="payout_failed");}
  async retrievePayout(i:{providerPayoutId:string}){return{providerObjectId:i.providerPayoutId,status:"paid" as const};}
  async createRefund(i:{providerPaymentId:string;amountMinorUnits:number;idempotencyKey:string}){return this.result("re",i.idempotencyKey,this.mode==="refund_failed");}
  async retrieveRefund(i:{providerRefundId:string}){return{providerObjectId:i.providerRefundId,status:"succeeded" as const};}
  async cancelPayment(i:{providerPaymentId:string}){return{providerObjectId:i.providerPaymentId,status:"failed" as const};}
  async verifyWebhook(i:{rawBody:Buffer;signature:string}){const expected=createHmac("sha256",this.webhookSecret).update(i.rawBody).digest("hex");
    if(expected!==i.signature)throw new Error("PAYMENT_WEBHOOK_SIGNATURE_INVALID");
    return JSON.parse(i.rawBody.toString("utf8"),(key,value)=>key.endsWith("At")?new Date(value):value)as VerifiedWebhookEvent;}
  private async result(prefix:string,key:string,forcedFailure=false):Promise<ProviderResult>{
    if(this.mode==="timeout")throw Object.assign(new Error("timeout"),{code:"PAYMENT_PROVIDER_TIMEOUT"});
    if(this.mode==="provider_error")throw new Error("PAYMENT_PROVIDER_ERROR");
    if(forcedFailure||this.mode==="decline")return{providerObjectId:id(prefix,key),status:"failed",failureCode:"declined"};
    const result:ProviderResult={providerObjectId:id(prefix,key),status:this.mode==="processing"?"processing":
      this.mode==="requires_action"?"requires_action":"submitted"};
    if(this.mode==="requires_action")result.clientSecret="fake_client_secret";
    return result;}
}
