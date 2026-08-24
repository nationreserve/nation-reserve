import{createHmac}from"node:crypto";import{describe,expect,it}from"vitest";import{StripePaymentProvider}from"./stripe-provider.js";
const platformSecret="whsec_platform_test_123456",connectSecret="whsec_connect_test_123456";
function event(type:string,object:Record<string,unknown>={id:"obj_1",status:"succeeded"},account?:string){return Buffer.from(JSON.stringify({id:`evt_${type}`,type,created:Math.floor(Date.now()/1000),livemode:false,...(account?{account}:{}),data:{object}}))}
function signature(raw:Buffer,secret:string){const timestamp=Math.floor(Date.now()/1000),value=createHmac("sha256",secret).update(`${timestamp}.${raw.toString("utf8")}`).digest("hex");return`t=${timestamp},v1=${value}`}
describe("Stripe platform and Connect webhook verification",()=>{
 const provider=new StripePaymentProvider("test","sk_test_unused",platformSecret,connectSecret);
 it("accepts a valid platform endpoint signature",async()=>{const raw=event("payment_intent.succeeded");expect(await provider.verifyWebhook({rawBody:raw,signature:signature(raw,platformSecret)})).toMatchObject({webhookSource:"platform",type:"payment_intent.succeeded"})});
 it("rejects an invalid platform signature",async()=>{const raw=event("payment_intent.succeeded");await expect(provider.verifyWebhook({rawBody:raw,signature:signature(raw,"whsec_wrong_platform_123")})).rejects.toThrow("PAYMENT_WEBHOOK_SIGNATURE_INVALID")});
 it("accepts a valid Connect endpoint signature",async()=>{const raw=event("account.updated",{id:"acct_1",details_submitted:true,payouts_enabled:true,capabilities:{transfers:"active"}},"acct_1");expect(await provider.verifyWebhook({rawBody:raw,signature:signature(raw,connectSecret)})).toMatchObject({webhookSource:"connect",type:"account.updated"})});
 it("rejects an invalid Connect signature",async()=>{const raw=event("payout.paid",{id:"po_1",status:"paid"},"acct_1");await expect(provider.verifyWebhook({rawBody:raw,signature:signature(raw,"whsec_wrong_connect_1234")})).rejects.toThrow("PAYMENT_WEBHOOK_SIGNATURE_INVALID")});
 it("preserves the connected account for external-account health events",async()=>{const raw=event("account.external_account.updated",{id:"ba_1"},"acct_1");expect((await provider.verifyWebhook({rawBody:raw,signature:signature(raw,connectSecret)})).metadata.connectedAccountId).toBe("acct_1")});
});
