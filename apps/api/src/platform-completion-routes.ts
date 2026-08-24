 
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";
import{z}from"zod";import type{PostgresPlatformCompletionService}from"./postgres-platform-completion-service.js";
const uuid=z.string().uuid(),org=z.object({organizationId:uuid}),ticket=z.object({id:uuid}),categories=z.enum(['ACCOUNT','PAYMENTS','BANK_PAYOUT_ACCOUNT','DOWNPAYMENT_QUEUE','ROBOT_OWNERSHIP','COMPANY_CONTRACT','PURCHASE_ORDER','MANUFACTURER','HEARTBEAT_ROBOT_OFFLINE','TRAINING_DATA','TRAINING_EQUIPMENT','MESSAGING','FILE_UPLOAD','BILLING','REFUND','OTHER']);
export function registerPlatformCompletionRoutes(app:AppFastifyInstance,o:{service:PostgresPlatformCompletionService;authenticate(r:AppFastifyRequest):Promise<{userId:string}>}){const actor=async(r:AppFastifyRequest)=>(await o.authenticate(r)).userId;
 app.get('/api/v1/organizations/:organizationId/support/tickets',async r=>{const p=org.parse(r.params);return o.service.tickets(await actor(r),p.organizationId)});
 app.post('/api/v1/organizations/:organizationId/support/tickets',async r=>{const p=org.parse(r.params),b=z.object({subject:z.string().min(3).max(200),category:categories,description:z.string().min(10).max(20000),priority:z.enum(['LOW','NORMAL','HIGH','URGENT']).default('NORMAL'),relatedRecords:z.record(z.string(),z.union([z.string(),z.number(),z.boolean(),z.null()])).default({}),diagnosticsSafe:z.record(z.string(),z.unknown()).default({}),objectIds:z.array(uuid).max(10).default([])}).parse(r.body);return o.service.createTicket(await actor(r),p.organizationId,b)});
 app.get('/api/v1/support/tickets/:id',async r=>o.service.ticket(await actor(r),ticket.parse(r.params).id));
 app.post('/api/v1/support/tickets/:id/replies',async r=>o.service.reply(await actor(r),ticket.parse(r.params).id,z.object({body:z.string().min(1).max(20000),internalNote:z.boolean().default(false)}).parse(r.body)));
 app.get('/api/v1/organizations/:organizationId/downpayment-queue',async r=>{const p=org.parse(r.params);return o.service.queue(await actor(r),p.organizationId)});
 app.get('/api/v1/platform/completion/overview',async r=>o.service.adminOverview(await actor(r)));
 app.get('/api/v1/platform/support/tickets',async r=>o.service.adminTickets(await actor(r),(r.query??{})as Record<string,unknown>));
 app.patch('/api/v1/platform/support/tickets/:id',async r=>o.service.updateTicket(await actor(r),ticket.parse(r.params).id,z.object({status:z.enum(['OPEN','AWAITING_SUPPORT','AWAITING_USER','IN_PROGRESS','RESOLVED','CLOSED','ESCALATED']).optional(),assignedToUserId:uuid.optional(),priority:z.enum(['LOW','NORMAL','HIGH','URGENT']).optional()}).parse(r.body)));
 app.get('/api/v1/platform/completion/diagnostics/:resource',async r=>o.service.diagnostics(await actor(r),z.object({resource:z.string().regex(/^[a-z-]+$/)}).parse(r.params).resource));
 app.get('/api/v1/secure-files/:context/:contextId/:attachmentId',async r=>{const p=z.object({context:z.enum(['support','message']),contextId:uuid,attachmentId:uuid}).parse(r.params);return o.service.file(await actor(r),p.context,p.contextId,p.attachmentId)});
}
