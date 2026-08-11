# MVP Acceptance Evidence

Status: **BLOCKED**  
Started: 2026-08-10T18:16:36.126Z  
Completed: 2026-08-10T18:34:49.801Z

| Stage | Status | Duration | Exit |
|---|---|---:|---:|
| specification-validation | passed | 17784 ms | 0 |
| strict-specification-coverage | failed | 18674 ms | 1 |
| migration-plan | passed | 532 ms | 0 |
| unit-and-integration-tests | passed | 264540 ms | 0 |
| authorization-and-api-tests | passed | 62585 ms | 0 |
| frontend-tests | blocked | 300042 ms | n/a |
| accessibility-tests | passed | 53376 ms | 0 |
| critical-journeys | passed | 48388 ms | 0 |
| heartbeat-simulator | failed | 18832 ms | 1 |
| security-source-audit | passed | 4772 ms | 0 |
| build | blocked | 300037 ms | n/a |

## Blocking stages

- strict-specification-coverage: exit 1
- frontend-tests: spawnSync C:\WINDOWS\system32\cmd.exe ETIMEDOUT
- heartbeat-simulator: exit 1
- build: spawnSync C:\WINDOWS\system32\cmd.exe ETIMEDOUT

## Placeholder findings

- `apps/web/src/AcceptancePage.test.tsx:3` — vi.mock("./auth-client.js", () => ({ api: { get: vi.fn((path: string) => Promise.resolve(path.endsWith("overview") ? { launch_blockers: 3, open_gaps: 5, active_waivers: 0, last_run: { status: "blocked", started_at: "2026-08-04T00:00:00Z" } 
- `apps/web/src/CompanyPages.accessibility.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));afterEach(()=>cleanup());
- `apps/web/src/CompanyPages.responsive.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));afterEach(()=>cleanup());
- `apps/web/src/CompanyPages.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
- `apps/web/src/CompanyPages.tsx:22` — function StructuredResource({kind,path}:{kind:keyof typeof resourceInfo;path:string}){const info=resourceInfo[kind]!,id=path.match(new RegExp(`/company/${kind}/([^/]+)`))?.[1],isForm=path.endsWith("/new")||path.endsWith("/edit"),state=useLo
- `apps/web/src/CompanyPages.tsx:25` — function JobBuilder({path}:{path:string}){const section=path.split("/").at(-1)??"overview";const groups=["Primary responsibilities","Secondary responsibilities","Conditional responsibilities","Prohibited activities","Human supervision","Sta
- `apps/web/src/CompanyPages.tsx:26` — function Training({path}:{path:string}){const equipment=path.includes("equipment"),uploads=path.includes("uploads"),packages=path.includes("packages"),sessions=path.includes("sessions"),title=equipment?"Motion-training equipment":uploads?"T
- `apps/web/src/CompanyPages.tsx:28` — function Sourcing({path}:{path:string}){const messages=path.includes("messages")||path.includes("conversations"),manufacturer=path.includes("manufacturers"),opportunity=path.includes("opportunities");return <Page title={messages?"Private ma
- `apps/web/src/ManufacturerPages.responsive.test.tsx:2` — import{afterEach,describe,expect,it,vi}from"vitest";import{cleanup,render,screen}from"@testing-library/react";import{ManufacturerPage}from"./ManufacturerPages.js";vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]
- `apps/web/src/ManufacturerPages.test.tsx:2` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));beforeEach(()=>{sessionStorage.setItem("nr-active-organization","00000000-0000-4000-8000-000000000017");vi.mocked(api.get).mockResolvedValue({items:[]})});afterEach(()=>{cle
- `apps/web/src/ManufacturerPages.tsx:16` — function WorkOrders({path}:{path:string}){const id=path.match(/\/work-orders\/([^/]+)/)?.[1],action=path.split("/").at(-1);return <Page title={id&&!['map','saved'].includes(id)?"Open work-order detail":"Open work-order discovery"} descripti
- `apps/web/src/ManufacturerPages.tsx:18` — function Messaging({path}:{path:string}){return <Page title={path.includes("contracts")?"Contract participant messages":"Private company conversations"} description="Authorized private communication with explicit participant visibility."><G
- `apps/web/src/OwnerPages.accessibility.test.tsx:6` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
- `apps/web/src/OwnerPages.responsive.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));
- `apps/web/src/OwnerPages.test.tsx:5` — vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
- `apps/web/src/OwnerPages.tsx:20` — function Dashboard(){const id=org(),state=useData(id?`/api/v1/organizations/${id}/earnings/summary`:undefined),v=object(state.data);return <Page title="Robot Owner dashboard" description="Robots, verified operation, earnings readiness, and 
- `apps/web/src/OwnerPages.tsx:21` — function Robots(){return <Page title="Robots" description="The central inventory for robots owned by the active organization."><div className="owner-toolbar"><input aria-label="Search by serial number" placeholder="Search serial number"/><s
- `apps/web/src/PublicPages.tsx:51` — function FAQ(){const[query,setQuery]=useState("");const filtered=faqs.filter(x=>x.join(" ").toLowerCase().includes(query.toLowerCase()));return <Page meta={{title:"RoboWorkPool FAQ",description:"Search answers about ownership, hiring, manuf
- `apps/web/src/PublicPages.tsx:53` — function ProductPage({product}:{product:"republic"|"med"}){const republic=product==="republic";const title=republic?"Republic":"Med Pool";return <Page meta={{title,description:republic?"Learn how Republic is separate from RoboWorkPool withi
- `apps/web/src/PublicPages.tsx:58` — function Status(){const services=["Web application","Client API","Manufacturer API","Heartbeat ingestion","Authentication","Billing","Notifications","Documentation"];return <Page meta={{title:"Service status",description:"View the public av
- `packages/specification/src/validator.ts:13` — const publicPages=(bundle.registries["public-website"] as{items?:Array<{route:string;status:string}>}).items??[];for(const page of publicPages)if(page.status==="planned")issues.push(issue("SPEC_SCREEN_NOT_FULLY_DEFINED",page.route==="/"?"cr
- `scripts/acceptance/inventory.mjs:13` — const inventory=files.map(p=>{let content="";try{content=readFileSync(p,"utf8");}catch{}const rel=relative(root,p).replaceAll("\\","/");return{path:rel,kind:kind(rel),domain:domain(rel),purpose:`Repository ${kind(rel).replaceAll("_"," ")} e
- `scripts/acceptance/mvp.mjs:49` — const marker = /\b(TODO|FIXME|placeholder|mock|not implemented|coming soon|fake data)\b/i;
- `scripts/acceptance/mvp.mjs:64` — `## Placeholder findings\n\n${placeholderFindings.slice(0, 200).map((f) => `- \`${f.file}:${f.line}\` — ${f.excerpt}`).join("\n") || "- None."}\n`;
- `scripts/release/validate-environment.mjs:3` — for(const key of Object.keys(process.env))if(/SECRET|TOKEN|PASSWORD|PRIVATE_KEY/.test(key)&&process.env[key]?.includes("change-me"))throw new Error(`${key} contains a development placeholder`);console.log(`Environment ${env} passed isolatio
- `scripts/security/verify-source.mjs:1` — import{readFile,readdir}from"node:fs/promises";import{join}from"node:path";const roots=["apps","packages","infrastructure","scripts"],findings=[];async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){if(["no
- `docs/appendix-i-website.md:493` — Do not display placeholder statistics in production.
- `docs/appendix-m-expanded-immutable-rules.md:1189` — ## Rule M-084 — No Placeholder Production Statistics
- `docs/appendix-m-expanded-immutable-rules.md:1195` — Placeholder or fabricated statistics must not appear in production.
- `docs/platform-integration-audit.md:7` — Placeholder scans are produced by `pnpm acceptance:mvp`. Matches are evidence for review; documentation using words such as “temporary” is not automatically a product stub. Primary workflow markers must be classified in the generated report
- `docs/specification/user-explanations.yaml:3` — - {explanation_id: EXP-FIN-VERIFIED, audience: [public_visitor, robot_owner, hiring_company], topic: "Verified operating pricing", purpose: "Separate verified operation from schedule and activation.", required_message: "Only verified operat
