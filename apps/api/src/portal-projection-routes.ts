
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";
import { z } from "zod";
import type { PostgresPortalProjectionService } from "./postgres-portal-projection-service.js";
const uuid=z.string().uuid();
export function registerPortalProjectionRoutes(app:AppFastifyInstance,options:{service:PostgresPortalProjectionService;authenticate(request:AppFastifyRequest):Promise<{userId:string}>}){const actor=async(r:AppFastifyRequest)=>(await options.authenticate(r)).userId;const organization=async(r:AppFastifyRequest)=>{const {organizationId}=z.object({organizationId:uuid}).parse(r.params);return{userId:await actor(r),organizationId}};
 app.post('/api/v1/account/organizations',async r=>options.service.createOrganization(await actor(r),z.object({type:z.enum(['robot_owner','hiring_company','robot_manufacturer']),legalName:z.string().trim().min(2).max(200),displayName:z.string().trim().min(2).max(200)}).parse(r.body)));
 app.post('/api/v1/invitations/preview',async r=>options.service.invitationPreview(await actor(r),z.object({token:z.string().min(16).max(500)}).parse(r.body).token));
 app.post('/api/v1/invitations/decline',async r=>options.service.declineInvitation(await actor(r),z.object({token:z.string().min(16).max(500)}).parse(r.body).token));
 app.get('/api/v1/account/preferences',async r=>options.service.preferences(await actor(r)));
 app.put('/api/v1/account/preferences',async r=>options.service.updatePreferences(await actor(r),z.record(z.string(),z.unknown()).parse(r.body)));
 app.post('/api/v1/account/deletion-requests',async r=>options.service.requestDeletion(await actor(r),z.object({reason:z.string().max(2000).optional()}).parse(r.body)));
 app.post('/api/v1/account/deletion-requests/:id/cancel',async r=>options.service.cancelDeletion(await actor(r),z.object({id:uuid}).parse(r.params).id));
 app.get('/api/v1/organizations/:organizationId/owner/dashboard',async r=>{const x=await organization(r);return options.service.ownerDashboard(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/owner/robots',async r=>{const x=await organization(r),q=z.object({search:z.string().max(200).optional()}).parse(r.query);return options.service.ownerRobots(x.userId,x.organizationId,q.search)});
 app.get('/api/v1/organizations/:organizationId/owner/claims',async r=>{const x=await organization(r);return options.service.ownerClaims(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/owner/claims/:id',async r=>{const x=await organization(r),{id}=z.object({id:uuid}).parse(r.params);return options.service.ownerClaims(x.userId,x.organizationId,id)});
 app.get('/api/v1/organizations/:organizationId/owner/assignments',async r=>{const x=await organization(r);return options.service.ownerAssignments(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/owner/assignments/:id',async r=>{const x=await organization(r),{id}=z.object({id:uuid}).parse(r.params);return options.service.ownerAssignments(x.userId,x.organizationId,id)});
 app.get('/api/v1/organizations/:organizationId/owner/operating-time',async r=>{const x=await organization(r);return options.service.ownerOperatingTime(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/owner/operating-time/:id',async r=>{const x=await organization(r),{id}=z.object({id:uuid}).parse(r.params);return options.service.ownerOperatingTime(x.userId,x.organizationId,id)});
 app.patch('/api/v1/organizations/:organizationId/owner/robots/:robotId/availability',async r=>{const x=await organization(r),p=z.object({robotId:uuid}).parse(r.params),body=z.object({available:z.boolean(),expectedVersion:z.number().int().positive()}).parse(r.body);return options.service.setOwnerAvailability(x.userId,x.organizationId,p.robotId,body.available,body.expectedVersion)});
 app.get('/api/v1/organizations/:organizationId/notifications',async r=>{const x=await organization(r);return options.service.notifications(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/manufacturer/dashboard',async r=>{const x=await organization(r);return options.service.manufacturerDashboard(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/manufacturer/work-orders',async r=>{const x=await organization(r),q=z.object({search:z.string().max(200).optional()}).parse(r.query);return options.service.discoverWorkOrders(x.userId,x.organizationId,q.search)});
 app.get('/api/v1/organizations/:organizationId/manufacturer/opportunities',async r=>{const x=await organization(r);return options.service.manufacturerOpportunities(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/manufacturer/fulfillment',async r=>{const x=await organization(r);return options.service.manufacturerFulfillment(x.userId,x.organizationId)});
 app.get('/api/v1/organizations/:organizationId/manufacturer/robots/:robotId/pre-shipment-verification',async r=>{const x=await organization(r),{robotId}=z.object({robotId:uuid}).parse(r.params);return options.service.preShipment(x.userId,x.organizationId,robotId)});
}
