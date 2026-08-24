 
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";

import { z } from "zod";

const uuid=z.string().uuid(),key=z.string().min(8).max(200);
export interface ExpansionService {
 publicQueueProgram():Promise<unknown>;
 marketplace(query:{tier?:number|undefined;dataType?:string|undefined;subscription?:boolean|undefined;limit:number}):Promise<unknown>;
 recordMarketplaceClick(productId:string,userId:string|undefined,metadata:Record<string,unknown>):Promise<void>;
 capacity(contractId:string,userId:string):Promise<unknown>;
 acknowledgeCapacity(input:Record<string,unknown>):Promise<unknown>;
 assignOwner(input:Record<string,unknown>):Promise<unknown>;
 createTrainingProject(input:Record<string,unknown>):Promise<unknown>;
 startTrainingSession(input:Record<string,unknown>):Promise<unknown>;
 reviewTrainingSession(input:Record<string,unknown>):Promise<unknown>;
 recalculateCapacity(input:Record<string,unknown>):Promise<unknown>;
 createPurchaseOrder(input:Record<string,unknown>):Promise<unknown>;
 lockAllocationPrice(input:Record<string,unknown>):Promise<unknown>;
 allocation(input:Record<string,unknown>):Promise<unknown>;
 payAllocationFromBalance(input:Record<string,unknown>):Promise<unknown>;
 transitionTrainingSession(input:Record<string,unknown>):Promise<unknown>;
 addTrainingStream(input:Record<string,unknown>):Promise<unknown>;
 reportTrainingPrivacy(input:Record<string,unknown>):Promise<unknown>;
 upsertMarketplaceProduct(input:Record<string,unknown>):Promise<unknown>;
}
export function registerExpansionRoutes(app:AppFastifyInstance,options:{service:ExpansionService;authenticate(request:AppFastifyRequest):Promise<{userId:string}>}){
 app.get("/api/v1/public/downpayment-program",async()=>options.service.publicQueueProgram());
 app.get("/api/v1/training-equipment",async r=>options.service.marketplace(z.object({tier:z.coerce.number().int().min(1).max(3).optional(),dataType:z.string().max(80).optional(),subscription:z.coerce.boolean().optional(),limit:z.coerce.number().int().min(1).max(100).default(25)}).parse(r.query)));
 app.post("/api/v1/training-equipment/:productId/outbound-click",async r=>{const actor=await options.authenticate(r).catch(()=>undefined),{productId}=z.object({productId:uuid}).parse(r.params);await options.service.recordMarketplaceClick(productId,actor?.userId,{requestId:r.id});return{recorded:true};});
 app.get("/api/v1/contracts/:contractId/purchase-capacity",async r=>{const actor=await options.authenticate(r),{contractId}=z.object({contractId:uuid}).parse(r.params);return options.service.capacity(contractId,actor.userId);});
 app.post("/api/v1/contracts/:contractId/purchase-capacity/acknowledgments",async r=>{const actor=await options.authenticate(r),{contractId}=z.object({contractId:uuid}).parse(r.params),body=z.object({purchaseOrderId:uuid.optional(),guidelineVersion:z.string().min(1),requestedQuantity:z.number().int().positive(),calculatedCapacity:z.number().int().nonnegative(),committedRobotCount:z.number().int().nonnegative(),availableRobotCount:z.number().int().nonnegative()}).parse(r.body);return options.service.acknowledgeCapacity({...body,contractId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/contracts/:contractId/ownership-allocations/by-username",async r=>{const actor=await options.authenticate(r),{contractId}=z.object({contractId:uuid}).parse(r.params),body=z.object({username:z.string().trim().min(2).max(80),allocatedMicrounits:z.coerce.bigint().positive()}).parse(r.body);return options.service.assignOwner({...body,contractId,assignedByUserId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/training-projects",async r=>{const actor=await options.authenticate(r),body=z.record(z.string(),z.unknown()).parse(r.body);return options.service.createTrainingProject({...body,createdByUserId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/training-projects/:projectId/sessions",async r=>{const actor=await options.authenticate(r),{projectId}=z.object({projectId:uuid}).parse(r.params),body=z.object({wearableKitId:uuid,consentVersion:z.string().min(1),consentAccepted:z.literal(true)}).parse(r.body);return options.service.startTrainingSession({...body,projectId,participantId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/contracts/:contractId/purchase-capacity/recalculate",async r=>{const actor=await options.authenticate(r),{contractId}=z.object({contractId:uuid}).parse(r.params);return options.service.recalculateCapacity({contractId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/contracts/:contractId/purchase-orders",async r=>{const actor=await options.authenticate(r),{contractId}=z.object({contractId:uuid}).parse(r.params),body=z.object({quantity:z.number().int().positive(),acknowledgmentId:uuid}).parse(r.body);return options.service.createPurchaseOrder({...body,contractId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/ownership-allocations/:allocationId/lock-price",async r=>{const actor=await options.authenticate(r),{allocationId}=z.object({allocationId:uuid}).parse(r.params),body=z.object({lockedUnitPriceCents:z.coerce.bigint().positive()}).parse(r.body);return options.service.lockAllocationPrice({...body,allocationId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.get("/api/v1/ownership-allocations/:allocationId",async r=>{const actor=await options.authenticate(r),{allocationId}=z.object({allocationId:uuid}).parse(r.params);return options.service.allocation({allocationId,userId:actor.userId});});
 app.post("/api/v1/ownership-allocations/:allocationId/pay-from-balance",async r=>{const actor=await options.authenticate(r),{allocationId}=z.object({allocationId:uuid}).parse(r.params);return options.service.payAllocationFromBalance({allocationId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});}); app.post("/api/v1/training-sessions/:sessionId/transition",async r=>{const actor=await options.authenticate(r),{sessionId}=z.object({sessionId:uuid}).parse(r.params),body=z.object({action:z.enum(["PAUSE","RESUME","END","SUBMIT"]),metadata:z.record(z.string(),z.unknown()).default({})}).parse(r.body);return options.service.transitionTrainingSession({...body,sessionId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/training-sessions/:sessionId/streams",async r=>{const actor=await options.authenticate(r),{sessionId}=z.object({sessionId:uuid}).parse(r.params),body=z.object({streamType:z.string().min(1).max(80),objectKey:z.string().min(1).max(1000),checksum:z.string().min(16).max(128),deviceTimestampStart:z.string().datetime().optional(),deviceTimestampEnd:z.string().datetime().optional(),offsetMilliseconds:z.number().int().optional(),synchronizationQuality:z.number().min(0).max(1).optional(),droppedSegments:z.array(z.unknown()).default([]),disconnections:z.array(z.unknown()).default([]),calibrationEvents:z.array(z.unknown()).default([]),clockDriftCorrections:z.array(z.unknown()).default([])}).parse(r.body);return options.service.addTrainingStream({...body,sessionId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/training-sessions/:sessionId/privacy-incidents",async r=>{const actor=await options.authenticate(r),{sessionId}=z.object({sessionId:uuid}).parse(r.params),body=z.object({incidentType:z.enum(["PRIVACY_ISSUE","BYSTANDER_INCIDENT","SENSITIVE_CONTENT","UNAUTHORIZED_LOCATION","CONSENT_WITHDRAWAL","DELETION_REQUEST"]),description:z.string().min(10).max(5000)}).parse(r.body);return options.service.reportTrainingPrivacy({...body,sessionId,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post("/api/v1/platform/training-equipment/products",async r=>{const actor=await options.authenticate(r),body=z.record(z.string(),z.unknown()).parse(r.body);return options.service.upsertMarketplaceProduct({...body,userId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});}); app.post("/api/v1/training-sessions/:sessionId/review",async r=>{const actor=await options.authenticate(r),{sessionId}=z.object({sessionId:uuid}).parse(r.params),body=z.object({decision:z.enum(["APPROVED","PARTIALLY_APPROVED","REJECTED","CHANGES_REQUESTED"]),approvedDurationSeconds:z.number().int().nonnegative(),notes:z.string().max(5000)}).parse(r.body);return options.service.reviewTrainingSession({...body,sessionId,reviewerUserId:actor.userId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
}
