/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion */
import { credentialProvisionSchema,heartbeatMessageSchema,inactiveReportSchema }
  from "@nation-reserve/heartbeat-domain";
import type { FastifyInstance,FastifyRequest } from "fastify";
import { z } from "zod";

export interface HeartbeatRouteService {
  ingest(body:unknown,headers:{credentialPrefix:string;signature:string;
    algorithm:"hmac-sha-256"|"ed25519";requestId:string;sourceIp?:string}):Promise<object>;
  robotStatus(credentialPrefix:string):Promise<object>;
  provisionCredential(userId:string,organizationId:string,robotId:string,input:object):Promise<object>;
  listCredentials(userId:string,organizationId:string,robotId:string):Promise<object[]>;
  revokeCredential(userId:string,organizationId:string,robotId:string,credentialId:string):Promise<void>;
  rotateCredential(userId:string,organizationId:string,robotId:string,credentialId:string,input:object):Promise<object>;
  operational(userId:string,organizationId:string,scope:string,id?:string):Promise<object>;
  reportInactive(userId:string,organizationId:string,assignmentId:string,input:object):Promise<object>;
  platform(userId:string,resource:string,id?:string):Promise<object>;
  incidentAction(userId:string,incidentId:string,action:string,input:object):Promise<object>;
}
export interface HeartbeatRouteOptions {
  service:HeartbeatRouteService;
  authenticate(request:FastifyRequest):Promise<{userId:string}>;
  maxBodyBytes:number;
  rateLimit?: (credentialPrefix:string,sourceIp:string)=>Promise<boolean>;
}
const header=(request:FastifyRequest,name:string)=>{
  const value=request.headers[name];if(typeof value!=="string"||!value)throw Object.assign(
    new Error(`Missing ${name}`),{statusCode:401,code:"HEARTBEAT_AUTHENTICATION_REQUIRED"});return value;
};
export async function registerHeartbeatRoutes(app:FastifyInstance<any,any,any,any>,
  options:HeartbeatRouteOptions){
  app.post("/robot-api/v1/heartbeat",{bodyLimit:options.maxBodyBytes},async request=>{
    const credentialPrefix=header(request,"x-rwp-robot-credential");
    if(options.rateLimit&&!await options.rateLimit(credentialPrefix,request.ip)) throw Object.assign(
      new Error("HEARTBEAT_RATE_LIMITED"),{statusCode:429,code:"HEARTBEAT_RATE_LIMITED"});
    const algorithm=z.enum(["hmac-sha-256","ed25519"]).parse(
      header(request,"x-rwp-signature-algorithm"));
    const body=heartbeatMessageSchema.parse(request.body);
    return options.service.ingest(body,{credentialPrefix,
      signature:header(request,"x-rwp-signature"),algorithm,requestId:String(request.id),
      sourceIp:request.ip});
  });
  app.get("/robot-api/v1/status",async request=>
    options.service.robotStatus(header(request,"x-rwp-robot-credential")));
  const base="/api/v1/organizations/:organizationId";
  const actor=async(r:FastifyRequest)=>(await options.authenticate(r)).userId;
  app.post<{Params:{organizationId:string;robotId:string}}>(
    `${base}/manufacturer/robots/:robotId/heartbeat-credentials`,async(request,reply)=>
      reply.status(201).send(await options.service.provisionCredential(await actor(request),
        request.params.organizationId,request.params.robotId,credentialProvisionSchema.parse(request.body))));
  app.get<{Params:{organizationId:string;robotId:string}}>(
    `${base}/manufacturer/robots/:robotId/heartbeat-credentials`,async request=>
      options.service.listCredentials(await actor(request),request.params.organizationId,request.params.robotId));
  app.post<{Params:{organizationId:string;robotId:string;credentialId:string}}>(`${base}/manufacturer/robots/:robotId/heartbeat-credentials/:credentialId/rotate`,async(request,reply)=>
    reply.status(201).send(await options.service.rotateCredential(await actor(request),request.params.organizationId,
      request.params.robotId,request.params.credentialId,credentialProvisionSchema.parse(request.body))));
  app.delete<{Params:{organizationId:string;robotId:string;credentialId:string}}>(
    `${base}/manufacturer/robots/:robotId/heartbeat-credentials/:credentialId`,async(request,reply)=>{
      await options.service.revokeCredential(await actor(request),request.params.organizationId,
        request.params.robotId,request.params.credentialId);return reply.status(204).send();});
  const operations=[
    ["robots/:id/heartbeat-status","owner-status"],["robots/:id/operating-time","owner-time"],
    ["robots/:id/downtime","owner-downtime"],["robots/:id/incidents","owner-incidents"],
    ["manufacturer/robots/:id/heartbeat-status","manufacturer-status"],
    ["manufacturer/robots/:id/heartbeat-messages","manufacturer-messages"],
    ["manufacturer/robots/:id/incidents","manufacturer-incidents"],
    ["manufacturer/heartbeat-overview","manufacturer-overview"],
    ["assignments/operational-status","company-overview"],
    ["assignments/:id/operational-status","company-status"],
    ["assignments/:id/operating-time","company-time"],["assignments/:id/incidents","company-incidents"],
  ] as const;
  for(const [path,scope] of operations)app.get<{Params:{organizationId:string;id?:string}}>(
    `${base}/${path}`,async request=>options.service.operational(await actor(request),
      request.params.organizationId,scope,request.params.id));
  app.post<{Params:{organizationId:string;assignmentId:string}}>(
    `${base}/assignments/:assignmentId/report-inactive`,async(request,reply)=>
      reply.status(201).send(await options.service.reportInactive(await actor(request),
        request.params.organizationId,request.params.assignmentId,inactiveReportSchema.parse(request.body))));
  for(const resource of ["heartbeat/overview","heartbeat/messages","operating-intervals","downtime",
    "operational-incidents","fraud-signals"])app.get(`/api/v1/platform/${resource}`,
      async request=>options.service.platform(await actor(request),resource));
  app.get<{Params:{incidentId:string}}>("/api/v1/platform/operational-incidents/:incidentId",
    async request=>options.service.platform(await actor(request),"operational-incidents",request.params.incidentId));
  for(const action of ["acknowledge","resolve","dismiss","hold-operating-time","release-operating-time"])
    app.post<{Params:{incidentId:string}}>(`/api/v1/platform/operational-incidents/:incidentId/${action}`,
      async request=>options.service.incidentAction(await actor(request),request.params.incidentId,
        action,(request.body??{}) as object));
}
