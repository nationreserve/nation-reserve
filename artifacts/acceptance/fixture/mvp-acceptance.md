# MVP Acceptance Evidence

Status: **PASSED**  
Started: 2026-08-11T02:39:53.525Z  
Completed: 2026-08-11T02:39:55.642Z

| Stage | Status | Duration | Exit |
|---|---|---:|---:|
| fixture | passed | 526 ms | 0 |

## Blocking stages

- None.

## Placeholder findings

- `apps/api/src/portal-projection-routes.test.ts:20` — const app=Fastify(), mock=service();
- `apps/api/src/portal-projection-routes.test.ts:21` — await registerPortalProjectionRoutes(app as never,{service:mock as never,authenticate:async()=>({userId:"00000000-0000-4000-8000-000000000001"})});
- `apps/api/src/portal-projection-routes.test.ts:24` — expect(mock.ownerDashboard).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002");
- `apps/api/src/portal-projection-routes.test.ts:28` — const app=Fastify(),mock=service(); await registerPortalProjectionRoutes(app as never,{service:mock as never,authenticate:async()=>({userId:"00000000-0000-4000-8000-000000000001"})});
- `apps/api/src/portal-projection-routes.test.ts:30` — expect(response.statusCode).toBe(200);expect(mock.createOrganization).toHaveBeenCalled();await app.close();
- `apps/api/src/portal-projection-routes.test.ts:32` — it("rejects malformed organization creation before persistence",async()=>{const app=Fastify(),mock=service();await registerPortalProjectionRoutes(app as never,{service:mock as never,authenticate:async()=>({userId:"00000000-0000-4000-8000-00
- `apps/api/src/postgres-acceptance-service.test.ts:2` — describe("acceptance waiver step-up",()=>{it("rejects a caller token without a matching session-bound grant",async()=>{const query=vi.fn().mockResolvedValueOnce({rowCount:1,rows:[{}]}).mockResolvedValueOnce({rowCount:0,rows:[]});const servi
- `apps/web/src/AcceptancePage.test.tsx:3` — vi.mock("./auth-client.js", () => ({ api: { get: vi.fn((path: string) => Promise.resolve(path.endsWith("overview") ? { launch_blockers: 3, open_gaps: 5, active_waivers: 0, last_run: { status: "blocked", started_at: "2026-08-04T00:00:00Z" } 
- `apps/web/src/CompanyPages.accessibility.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));afterEach(()=>cleanup());
- `apps/web/src/CompanyPages.responsive.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));afterEach(()=>cleanup());
- `apps/web/src/CompanyPages.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
- `apps/web/src/ManufacturerPages.responsive.test.tsx:2` — import{afterEach,describe,expect,it,vi}from"vitest";import{cleanup,render,screen}from"@testing-library/react";import{ManufacturerPage}from"./ManufacturerPages.js";vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]
- `apps/web/src/ManufacturerPages.test.tsx:2` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));beforeEach(()=>{sessionStorage.setItem("nr-active-organization","00000000-0000-4000-8000-000000000017");vi.mocked(api.get).mockResolvedValue({items:[]})});afterEach(()=>{cle
- `apps/web/src/MarketplacePages.test.tsx:7` — vi.mock("./auth-client.js", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
- `apps/web/src/MarketplacePages.test.tsx:80` — it("renders a useful empty state rather than a mock success", async () => {
- `apps/web/src/MarketplacePages.tsx:91` — placeholder="Search by manufacturer or robot model"
- `apps/web/src/OwnerPages.accessibility.test.tsx:6` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
- `apps/web/src/OwnerPages.responsive.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));
- `apps/web/src/OwnerPages.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
- `apps/web/src/OwnerPages.tsx:21` — function Robots(){const id=org(),[search,setSearch]=useState(""),state=useData(id?`/api/v1/organizations/${id}/owner/robots${search?`?search=${encodeURIComponent(search)}`:""}`:undefined);return <Page title="Robots" description="The central
- `apps/web/src/PublicPages.tsx:991` — placeholder="Try “verified time” or “queue"
- `apps/web/src/PublicPages.tsx:1047` — Placeholder links are intentionally not published.
- `apps/web/src/PublicPages.tsx:1071` — Med Pool is not implemented and this overview is not medical advice, an
- `apps/web/src/PublicPages.tsx:1304` — invented uptime statistics or placeholder incident history.
- `packages/specification/src/validator.ts:13` — const publicPages=(bundle.registries["public-website"] as{items?:Array<{route:string;status:string}>}).items??[];for(const page of publicPages)if(page.status==="planned")issues.push(issue("SPEC_SCREEN_NOT_FULLY_DEFINED",page.route==="/"?"cr
- `scripts/acceptance/inventory.mjs:13` — const inventory=files.map(p=>{let content="";try{content=readFileSync(p,"utf8");}catch{}const rel=relative(root,p).replaceAll("\\","/");return{path:rel,kind:kind(rel),domain:domain(rel),purpose:`Repository ${kind(rel).replaceAll("_"," ")} e
- `scripts/acceptance/mvp.mjs:49` — const marker = /\b(TODO|FIXME|placeholder|mock|not implemented|coming soon|fake data)\b/i;
- `scripts/acceptance/mvp.mjs:64` — `## Placeholder findings\n\n${placeholderFindings.slice(0, 200).map((f) => `- \`${f.file}:${f.line}\` — ${f.excerpt}`).join("\n") || "- None."}\n`;
- `scripts/release/validate-environment.mjs:3` — for(const key of Object.keys(process.env))if(/SECRET|TOKEN|PASSWORD|PRIVATE_KEY/.test(key)&&process.env[key]?.includes("change-me"))throw new Error(`${key} contains a development placeholder`);console.log(`Environment ${env} passed isolatio
- `scripts/security/verify-source.mjs:1` — import{readFile,readdir}from"node:fs/promises";import{join}from"node:path";const roots=["apps","packages","infrastructure","scripts"],findings=[];async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){if(["no
- `docs/appendix-i-website.md:493` — Do not display placeholder statistics in production.
- `docs/appendix-m-expanded-immutable-rules.md:1189` — ## Rule M-084 — No Placeholder Production Statistics
- `docs/appendix-m-expanded-immutable-rules.md:1195` — Placeholder or fabricated statistics must not appear in production.
- `docs/complete-product-audit-2026-08-10.md:84` — - Company/Manufacturer messaging mock screens were replaced on canonical routes.
- `docs/complete-product-audit-2026-08-10.md:85` — - Manufacturer discovery mock was replaced on the canonical Company route.
- `docs/complete-product-audit-2026-08-10.md:155` — 1. Manufacturer discovery and messaging were documented but mock-only: fixed with production API/service/UI and migration 0036.
- `docs/complete-product-audit-2026-08-10.md:163` — 2. Manufacturer directory and conversation placeholder notices: canonical routes now connected.
- `docs/complete-product-audit-2026-08-10.md:298` — | Are mock-only financial actions remaining? | NO — no known fake-success financial action; external execution is disabled without configuration |
- `docs/complete-product-audit-2026-08-10.md:299` — | Are placeholder pages remaining? | YES — gap |
- `docs/complete-product-audit-2026-08-10.md:307` — RoboWorkPool is ready for **external Stripe/Supabase configuration and staged test-mode integration work**, but it is **not ready for production or an unqualified realistic end-to-end acceptance run**. Apply migration 0036, configure extern
- `docs/platform-integration-audit.md:7` — Placeholder scans are produced by `pnpm acceptance:mvp`. Matches are evidence for review; documentation using words such as “temporary” is not automatically a product stub. Primary workflow markers must be classified in the generated report
- `docs/specification/user-explanations.yaml:3` — - {explanation_id: EXP-FIN-VERIFIED, audience: [public_visitor, robot_owner, hiring_company], topic: "Verified operating pricing", purpose: "Separate verified operation from schedule and activation.", required_message: "Only verified operat
