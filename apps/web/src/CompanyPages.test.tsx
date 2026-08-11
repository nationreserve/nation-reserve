import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {CompanyPage,isCompanyRoute} from "./CompanyPages.js";
import {api} from "./auth-client.js";
vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
beforeEach(()=>{sessionStorage.setItem("nr-active-organization","00000000-0000-4000-8000-000000000016");vi.mocked(api.get).mockResolvedValue({items:[]})});afterEach(()=>{cleanup();vi.clearAllMocks()});
describe("Prompt 016 Hiring Company portal",()=>{
 it("recognizes only company routes",()=>{expect(isCompanyRoute("/company")).toBe(true);expect(isCompanyRoute("/company/training/packages/new")).toBe(true);expect(isCompanyRoute("/owner")).toBe(false)});
 it("keeps scheduled and verified dashboard metrics separate",()=>{render(<CompanyPage path="/company/dashboard"/>);expect(screen.getByText("Robots scheduled now")).toBeInTheDocument();expect(screen.getByText("Verified operating now")).toBeInTheDocument();expect(screen.getByText(/Billing is based on verified operating time/i)).toBeInTheDocument()});
 it("does not fabricate live production statistics",()=>{render(<CompanyPage path="/company/dashboard"/>);expect(screen.getByText(/No production values are fabricated/i)).toBeInTheDocument()});
 it("deep links dashboard actions",()=>{render(<CompanyPage path="/company/dashboard"/>);expect(screen.getByRole("link",{name:"Upload missing training files"})).toHaveAttribute("href","/company/training/uploads/new");expect(screen.getByRole("link",{name:"Investigate inactive robot"})).toHaveAttribute("href","/company/inactive-reports/new")});
 it("represents onboarding prerequisites",()=>{render(<CompanyPage path="/company/onboarding"/>);expect(screen.getAllByText("Company profile")).toHaveLength(2);expect(screen.getAllByText("Training method")).toHaveLength(2);expect(screen.getAllByText("Sourcing readiness")).toHaveLength(2)});
 it("keeps facility site files private",()=>{render(<CompanyPage path="/company/facilities/site/work-areas/zone"/>);expect(screen.getByText(/remain private company information/i)).toBeInTheDocument()});
 it("renders structured job safety separately",()=>{render(<CompanyPage path="/company/jobs/job/safety"/>);expect(screen.getByText("Structured safety and performance")).toBeInTheDocument();expect(screen.getByText(/cannot be hidden/i)).toBeInTheDocument()});
 it("does not claim training equipment compatibility",()=>{render(<CompanyPage path="/company/training/equipment/catalog"/>);expect(screen.getByText(/No device is labeled compatible/i)).toBeInTheDocument()});
 it("documents private resumable upload architecture",()=>{render(<CompanyPage path="/company/training/uploads/new"/>);expect(screen.getByText(/short-lived signed multipart URLs/i)).toBeInTheDocument();expect(screen.getAllByText(/quarantine/i)).toHaveLength(2)});
 it("protects training package access",()=>{render(<CompanyPage path="/company/training/packages/package/access"/>);expect(screen.getByText(/specific immutable version/i)).toBeInTheDocument()});
 it("rejects open marketplace behavior",()=>{render(<CompanyPage path="/company/opportunities/new"/>);expect(screen.getByText(/normally cannot see other recipients/i)).toBeInTheDocument()});
 it("requires participant visibility for group messaging",()=>{render(<CompanyPage path="/company/contracts/contract/messages"/>);expect(screen.getByText("Group conversation")).toBeInTheDocument();expect(screen.getByText(/explicit participant preview/i)).toBeInTheDocument()});
 it("renders a backend-backed contract workspace with the normal concurrent limit",()=>{render(<CompanyPage path="/company/contracts/new"/>);expect(screen.getByLabelText("Normal concurrent robots")).toBeInTheDocument();expect(screen.getByLabelText("Required capabilities")).toBeInTheDocument();expect(screen.getByText(/Additional shifts do not multiply this limit/i)).toBeInTheDocument();expect(screen.getByRole("button",{name:"Create versioned contract draft"})).toBeEnabled();});
 it("uses real organization-scoped contract API",()=>{render(<CompanyPage path="/company/contracts"/>);expect(api.get).toHaveBeenCalledWith("/api/v1/organizations/00000000-0000-4000-8000-000000000016/company/contracts")});
 it("keeps assignment operations read only",()=>{render(<CompanyPage path="/company/assignments/assignment"/>);expect(screen.queryByRole("button",{name:/cancel|replace/i})).not.toBeInTheDocument()});
 it("requires serial confirmation for inactive reports",()=>{render(<CompanyPage path="/company/inactive-reports/new"/>);expect(screen.getByText("Serial confirmation required")).toBeInTheDocument()});
 it("distinguishes invoice and payment states",()=>{render(<CompanyPage path="/company/invoices/invoice/pay"/>);expect(screen.getByText(/Submitted never means settled or paid/i)).toBeInTheDocument();expect(screen.getByText("Payment confirmation required")).toBeInTheDocument()});
 it("routes all report families through shared reporting",()=>{render(<CompanyPage path="/company/reports"/>);expect(screen.getAllByRole("link",{name:"Configure report"})).toHaveLength(6)});
 it("states server-side permission boundary",()=>{render(<CompanyPage path="/company/team"/>);expect(screen.getByText(/explicit server-side permissions/i)).toBeInTheDocument()});
});


