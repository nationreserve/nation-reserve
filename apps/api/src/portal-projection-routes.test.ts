import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerPortalProjectionRoutes } from "./portal-projection-routes.js";

function service() {
  return {
    ownerDashboard: vi.fn().mockResolvedValue({ robots: { total: 2 }, queue: { position: 4 } }),
    ownerRobots: vi.fn().mockResolvedValue({ items: [] }),
    ownerClaims: vi.fn(), ownerAssignments: vi.fn(), ownerOperatingTime: vi.fn(), notifications: vi.fn(),
    manufacturerDashboard: vi.fn(), discoverWorkOrders: vi.fn().mockResolvedValue({ items: [] }),
    manufacturerOpportunities: vi.fn(), manufacturerFulfillment: vi.fn(), preShipment: vi.fn(),
    createOrganization: vi.fn().mockResolvedValue({ id: "00000000-0000-4000-8000-000000000099", status: "active" }),
    invitationPreview: vi.fn(), declineInvitation: vi.fn(), preferences: vi.fn(), updatePreferences: vi.fn(),
    requestDeletion: vi.fn(), cancelDeletion: vi.fn(),
  };
}

describe("portal completion routes", () => {
  it("returns an authenticated owner projection", async () => {
    const app=Fastify(), mock=service();
    await registerPortalProjectionRoutes(app as never,{service:mock as never,authenticate:async()=>({userId:"00000000-0000-4000-8000-000000000001"})});
    const response=await app.inject({method:"GET",url:"/api/v1/organizations/00000000-0000-4000-8000-000000000002/owner/dashboard"});
    expect(response.statusCode).toBe(200); expect(response.json().queue.position).toBe(4);
    expect(mock.ownerDashboard).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002");
    await app.close();
  });
  it("validates and creates one organization under the existing account", async()=>{
    const app=Fastify(),mock=service(); await registerPortalProjectionRoutes(app as never,{service:mock as never,authenticate:async()=>({userId:"00000000-0000-4000-8000-000000000001"})});
    const response=await app.inject({method:"POST",url:"/api/v1/account/organizations",payload:{type:"hiring_company",legalName:"Example Operations LLC",displayName:"Example Operations"}});
    expect(response.statusCode).toBe(200);expect(mock.createOrganization).toHaveBeenCalled();await app.close();
  });
  it("rejects malformed organization creation before persistence",async()=>{const app=Fastify(),mock=service();await registerPortalProjectionRoutes(app as never,{service:mock as never,authenticate:async()=>({userId:"00000000-0000-4000-8000-000000000001"})});const response=await app.inject({method:"POST",url:"/api/v1/account/organizations",payload:{type:"unknown",legalName:"x",displayName:"x"}});expect(response.statusCode).toBe(500);expect(mock.createOrganization).not.toHaveBeenCalled();await app.close();});
});
