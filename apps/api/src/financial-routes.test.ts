import Fastify from"fastify";import{afterEach,describe,expect,it,vi}from"vitest";
import{registerFinancialRoutes,type FinancialRouteService}from"./financial-routes.js";
const service=new Proxy({}, {get:()=>vi.fn(async()=>({}))})as FinancialRouteService;
const apps:ReturnType<typeof Fastify>[]=[];afterEach(async()=>Promise.all(apps.splice(0).map(a=>a.close())));
describe("financial routes",()=>{it("authenticates organization billing reads",async()=>{const app=Fastify();apps.push(app);
  await registerFinancialRoutes(app,{service,authenticate:async()=>{throw Object.assign(new Error("AUTH"),{statusCode:401});}});
  const response=await app.inject({method:"GET",url:`/api/v1/organizations/${crypto.randomUUID()}/billing/summary`});
  expect(response.statusCode).toBe(401);});
  it("validates positive dispute amounts",async()=>{const app=Fastify();apps.push(app);
    await registerFinancialRoutes(app,{service,authenticate:async()=>({userId:crypto.randomUUID()})});
    const response=await app.inject({method:"POST",url:`/api/v1/organizations/${crypto.randomUUID()}/invoices/${crypto.randomUUID()}/disputes`,
      payload:{amountMinorUnits:0,reasonCode:"x",description:"invalid amount"}});expect(response.statusCode).toBe(500);});});
