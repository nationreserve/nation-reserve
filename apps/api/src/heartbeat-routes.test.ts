import Fastify from "fastify";
import { afterEach,describe,expect,it,vi } from "vitest";
import { registerHeartbeatRoutes,type HeartbeatRouteService } from "./heartbeat-routes.js";

const service=new Proxy({}, {get:()=>vi.fn(async()=>({accepted:true}))}) as HeartbeatRouteService;
const apps:ReturnType<typeof Fastify>[]=[];
afterEach(async()=>Promise.all(apps.splice(0).map(app=>app.close())));
describe("robot heartbeat route",()=>{
  it("requires robot-scoped credential headers",async()=>{
    const app=Fastify();apps.push(app);await registerHeartbeatRoutes(app,{service,maxBodyBytes:32768,
      authenticate:async()=>({userId:crypto.randomUUID()})});
    const response=await app.inject({method:"POST",url:"/robot-api/v1/heartbeat",payload:{}});
    expect(response.statusCode).toBe(401);
  });
  it("enforces the body size limit",async()=>{
    const app=Fastify();apps.push(app);await registerHeartbeatRoutes(app,{service,maxBodyBytes:128,
      authenticate:async()=>({userId:crypto.randomUUID()})});
    const response=await app.inject({method:"POST",url:"/robot-api/v1/heartbeat",
      headers:{"x-rwp-signature-algorithm":"hmac-sha-256","x-rwp-robot-credential":"rwp_x",
        "x-rwp-signature":"x"},payload:{padding:"x".repeat(500)}});
    expect(response.statusCode).toBe(413);
  });
});
