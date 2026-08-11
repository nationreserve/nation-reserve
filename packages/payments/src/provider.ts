export type ProviderStatus="created"|"submitted"|"requires_action"|"processing"|"succeeded"|"paid"|"failed"|"unknown";
export interface ProviderResult{providerObjectId:string;status:ProviderStatus;clientSecret?:string;failureCode?:string;}
export interface PaymentProvider{
  readonly name:string;readonly environment:"test"|"live";
  createCompanyCustomer(input:{organizationId:string;email?:string;name:string;idempotencyKey:string}):Promise<{id:string}>;
  createUserCustomer(input:{userId:string;email?:string;name:string;idempotencyKey:string}):Promise<{id:string}>;
  createPaymentMethodSetup(input:{customerId:string;returnUrl:string;idempotencyKey:string}):Promise<ProviderResult>;
  retrievePaymentMethod(input:{customerId:string;paymentMethodId:string}):Promise<{id:string;type:"card"|"us_bank_account";brand?:string;last4?:string;expirationMonth?:number;expirationYear?:number}>;
  createOwnerConnectedAccount(input:{organizationId:string;country:string;idempotencyKey:string}):Promise<{id:string;status:string}>;
  createOwnerOnboardingLink(input:{accountId:string;returnUrl:string;refreshUrl:string}):Promise<{url:string}>;
  retrieveConnectedAccount(input:{accountId:string}):Promise<{status:string;detailsSubmitted:boolean;transfersEnabled:boolean;payoutsEnabled:boolean;requirements:string[]}>;
  createInvoiceCollection(input:{customerId:string;paymentMethodId:string;amountMinorUnits:number;currency:"USD";idempotencyKey:string}):Promise<ProviderResult>;
  createFundingPayment(input:{customerId:string;paymentMethodId:string;amountMinorUnits:number;currency:"USD";idempotencyKey:string;metadata:Record<string,string>;returnUrl?:string}):Promise<ProviderResult>;
  retrievePayment(input:{providerPaymentId:string}):Promise<ProviderResult>;
  createOwnerPayout(input:{accountId:string;amountMinorUnits:number;currency:"USD";idempotencyKey:string}):Promise<ProviderResult>;
  retrievePayout(input:{providerPayoutId:string}):Promise<ProviderResult>;
  createRefund(input:{providerPaymentId:string;amountMinorUnits:number;idempotencyKey:string}):Promise<ProviderResult>;
  retrieveRefund(input:{providerRefundId:string}):Promise<ProviderResult>;
  cancelPayment(input:{providerPaymentId:string;idempotencyKey:string}):Promise<ProviderResult>;
  verifyWebhook(input:{rawBody:Buffer;signature:string}):Promise<VerifiedWebhookEvent>;
}
export interface VerifiedWebhookEvent{id:string;type:string;createdAt:Date;environment:"test"|"live";
  objectId:string;status:string;amountMinorUnits?:number;currency?:string;feeMinorUnits?:number;metadata:Record<string,string>;}
export class PaymentProviderError extends Error{constructor(public readonly code:string,message:string,
  public readonly outcome:"failed"|"unknown"="failed"){super(message);}}
