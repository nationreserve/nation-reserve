 
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";
import { allocationCommandSchema,createContractCommandSchema,reviseContractCommandSchema }
  from "@nation-reserve/contract-operations";

import { z } from "zod";

export interface ContractRouteService {
  list(userId:string,organizationId:string,side:"company"|"manufacturer"):Promise<object[]>;
  detail(userId:string,organizationId:string,contractId:string):Promise<object>;
  create(userId:string,organizationId:string,input:object):Promise<object>;
  revise(userId:string,organizationId:string,contractId:string,input:object):Promise<object>;
  submit(userId:string,organizationId:string,contractId:string):Promise<void>;
  decide(userId:string,organizationId:string,versionId:string,party:"hiring_company"|"manufacturer",
    decision:"approved"|"changes_requested"|"rejected",reason?:string):Promise<object>;
  allocate(userId:string,organizationId:string,contractId:string,input:object):Promise<object>;
  assignment(userId:string,organizationId:string,assignmentId:string):Promise<object>;
  replace(userId:string,organizationId:string,assignmentId:string,robotId:string):Promise<object>;
  cancelAssignment(userId:string,organizationId:string,assignmentId:string,
    party:"hiring_company"|"manufacturer"|"platform",reason:string):Promise<void>;
}
export interface ContractRouteOptions {
  service:ContractRouteService;
  authenticate(request:AppFastifyRequest):Promise<{userId:string}>;
}
export function registerContractRoutes(app:AppFastifyInstance,options:ContractRouteOptions){
  const user=async(r:AppFastifyRequest)=>(await options.authenticate(r)).userId;
  const company="/api/v1/organizations/:organizationId/company/contracts";
  const manufacturer="/api/v1/organizations/:organizationId/manufacturer/contracts";
  app.get<{Params:{organizationId:string}}>(company,async r=>
    options.service.list(await user(r),r.params.organizationId,"company"));
  app.post<{Params:{organizationId:string}}>(company,async(r,reply)=>
    reply.status(201).send(await options.service.create(await user(r),r.params.organizationId,
      createContractCommandSchema.parse(r.body))));
  app.get<{Params:{organizationId:string;contractId:string}}>(`${company}/:contractId`,async r=>
    options.service.detail(await user(r),r.params.organizationId,r.params.contractId));
  app.post<{Params:{organizationId:string;contractId:string}}>(`${company}/:contractId/revisions`,
    async(r,reply)=>reply.status(201).send(await options.service.revise(await user(r),
      r.params.organizationId,r.params.contractId,reviseContractCommandSchema.parse(r.body))));
  app.post<{Params:{organizationId:string;contractId:string}}>(`${company}/:contractId/submit`,
    async(r,reply)=>{await options.service.submit(await user(r),r.params.organizationId,r.params.contractId);
      return reply.status(204).send();});
  app.get<{Params:{organizationId:string}}>(manufacturer,async r=>
    options.service.list(await user(r),r.params.organizationId,"manufacturer"));
  app.get<{Params:{organizationId:string;contractId:string}}>(`${manufacturer}/:contractId`,async r=>
    options.service.detail(await user(r),r.params.organizationId,r.params.contractId));
  const decision=z.object({versionId:z.string().uuid(),
    decision:z.enum(["approved","changes_requested","rejected"]),reason:z.string().optional()});
  app.post<{Params:{organizationId:string;contractId:string}}>(`${manufacturer}/:contractId/decision`,
    async r=>{const body=decision.parse(r.body);return options.service.decide(await user(r),
      r.params.organizationId,body.versionId,"manufacturer",body.decision,body.reason);});
  app.post<{Params:{organizationId:string;contractId:string}}>(`${company}/:contractId/decision`,
    async r=>{const body=decision.parse(r.body);return options.service.decide(await user(r),
      r.params.organizationId,body.versionId,"hiring_company",body.decision,body.reason);});
  app.post<{Params:{organizationId:string;contractId:string}}>(`${manufacturer}/:contractId/allocations`,
    async(r,reply)=>reply.status(201).send(await options.service.allocate(await user(r),
      r.params.organizationId,r.params.contractId,allocationCommandSchema.parse(r.body))));
  app.get<{Params:{organizationId:string;assignmentId:string}}>(
    "/api/v1/organizations/:organizationId/assignments/:assignmentId",async r=>
      options.service.assignment(await user(r),r.params.organizationId,r.params.assignmentId));
  app.post<{Params:{organizationId:string;assignmentId:string}}>(
    "/api/v1/organizations/:organizationId/assignments/:assignmentId/replace",async r=>{
      const body=z.object({robotId:z.string().uuid()}).parse(r.body);
      return options.service.replace(await user(r),r.params.organizationId,r.params.assignmentId,body.robotId);
    });
  app.post<{Params:{organizationId:string;assignmentId:string}}>(
    "/api/v1/organizations/:organizationId/assignments/:assignmentId/cancel",async(r,reply)=>{
      const body=z.object({party:z.enum(["hiring_company","manufacturer","platform"]),
        reason:z.string().min(3)}).parse(r.body);
      await options.service.cancelAssignment(await user(r),r.params.organizationId,
        r.params.assignmentId,body.party,body.reason);return reply.status(204).send();
    });
}

