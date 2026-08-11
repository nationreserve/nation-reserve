/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/require-await,@typescript-eslint/no-unsafe-argument */
import type{FastifyInstance,FastifyRequest}from"fastify";import type{PostgresSpecificationService}from"./postgres-specification-service.js";
export async function registerSpecificationRoutes(app:FastifyInstance<any,any,any,any>,options:{service:PostgresSpecificationService;authenticate(r:FastifyRequest):Promise<{userId:string}>}){const actor=async(r:FastifyRequest)=>(await options.authenticate(r)).userId,base="/api/v1/platform/specification";
 app.get(`${base}/overview`,async r=>options.service.overview(await actor(r)));
 for(const resource of["requirements","features","journeys","screens","user-explanations","immutable-rules","prompts","conflicts","deferred"])app.get(`${base}/${resource}`,async r=>options.service.collection(await actor(r),resource));
 app.get<{Params:{requirementId:string}}>(`${base}/requirements/:requirementId`,async r=>options.service.requirement(await actor(r),r.params.requirementId));
 app.get(`${base}/validation-runs`,async r=>options.service.validationRuns(await actor(r)));
 app.get<{Params:{validationRunId:string}}>(`${base}/validation-runs/:validationRunId`,async r=>options.service.validationRuns(await actor(r),r.params.validationRunId));
 app.post(`${base}/validation-runs`,async r=>options.service.validate(await actor(r)));
 app.post(`${base}/sync`,async r=>options.service.sync(await actor(r)));
}
