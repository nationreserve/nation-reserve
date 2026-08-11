import{createHmac}from"node:crypto";import{describe,expect,it}from"vitest";import{FakePaymentProvider}from"./fake-provider.js";import{paymentConfigSchema}from"./config.js";
describe("provider-neutral payments",()=>{it("uses deterministic idempotent fake IDs",async()=>{const p=new FakePaymentProvider();
  const input={customerId:"cus",paymentMethodId:"pm",amountMinorUnits:575,currency:"USD"as const,idempotencyKey:"invoice-1"};
  expect((await p.createInvoiceCollection(input)).providerObjectId).toBe((await p.createInvoiceCollection(input)).providerObjectId);});
  it("verifies raw signed webhook bytes",async()=>{const secret="fake-webhook-secret",p=new FakePaymentProvider("success",secret);
    const raw=Buffer.from(JSON.stringify({id:"evt_1",type:"payment.succeeded",createdAt:new Date().toISOString(),
      environment:"test",objectId:"pi_1",status:"succeeded",metadata:{attemptId:"a"}}));
    const signature=createHmac("sha256",secret).update(raw).digest("hex");
    expect((await p.verifyWebhook({rawBody:raw,signature})).id).toBe("evt_1");
    await expect(p.verifyWebhook({rawBody:raw,signature:"bad"})).rejects.toThrow();});
  it("maps fake provider timeouts to unknown outcomes",async()=>{const p=new FakePaymentProvider("timeout");await expect(p.createInvoiceCollection({customerId:"cus",paymentMethodId:"pm",amountMinorUnits:100,currency:"USD",idempotencyKey:"timeout"})).rejects.toMatchObject({code:"PAYMENT_PROVIDER_TIMEOUT"});});
  it("keeps failed refunds nonterminal for internal obligations",async()=>{const p=new FakePaymentProvider("refund_failed"),result=await p.createRefund({providerPaymentId:"pi",amountMinorUnits:100,idempotencyKey:"refund"});expect(result.status).toBe("failed");});
  it("forbids the fake provider in production",()=>{expect(()=>paymentConfigSchema.parse({NODE_ENV:"production",PAYMENT_PROVIDER:"fake",PAYMENT_PROVIDER_ENVIRONMENT:"live",PAYMENT_METHOD_SETUP_RETURN_URL:"https://example.test/billing",PAYOUT_ONBOARDING_RETURN_URL:"https://example.test/payouts",PAYOUT_ONBOARDING_REFRESH_URL:"https://example.test/payouts"})).toThrow();});  it("does not coerce the string false into enabled execution",()=>{const config=paymentConfigSchema.parse({PAYMENT_EXECUTION_ENABLED:"false"});expect(config.PAYMENT_EXECUTION_ENABLED).toBe(false);});
  it("rejects live mode and test keys in production",()=>{expect(()=>paymentConfigSchema.parse({NODE_ENV:"production",PAYMENT_PROVIDER:"stripe",PAYMENT_EXECUTION_ENABLED:"true",PAYMENT_PROVIDER_ENVIRONMENT:"live",PAYMENT_PROVIDER_API_KEY:"sk_test_example",PAYMENT_METHOD_SETUP_RETURN_URL:"https://example.test/billing",PAYOUT_ONBOARDING_RETURN_URL:"https://example.test/payouts",PAYOUT_ONBOARDING_REFRESH_URL:"https://example.test/payouts"})).toThrow();});});
