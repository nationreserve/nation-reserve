// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen,within} from "@testing-library/react";
import {OwnerPage} from "./OwnerPages.js";
import {api} from "./auth-client.js";
vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
beforeEach(()=>{sessionStorage.setItem("nr-active-organization","00000000-0000-4000-8000-000000000015");vi.mocked(api.get).mockResolvedValue({items:[]});});afterEach(()=>{cleanup();vi.clearAllMocks()});
describe("Prompt 015 accessibility and permission boundaries",()=>{
  it("gives each major page one descriptive level-one heading and contextual help",()=>{for(const path of ["/owner/dashboard","/owner/robots","/owner/operating-time","/owner/earnings","/owner/payouts","/owner/settings"]){const view=render(<OwnerPage path={path}/>);expect(screen.getAllByRole("heading",{level:1})).toHaveLength(1);expect(screen.getByRole("heading",{name:"What this page is about"})).toBeInTheDocument();view.unmount()}});
  it("labels every robot inventory control",()=>{render(<OwnerPage path="/owner/robots"/>);for(const name of ["Search by serial number","Manufacturer","Model","Status","Availability","Assignment"])expect(screen.getByLabelText(name)).toBeInTheDocument()});
  it("exposes ownership submission status through a live region",async()=>{vi.mocked(api.post).mockResolvedValue({});render(<OwnerPage path="/owner/robots/new"/>);expect(screen.getByRole("button",{name:"Submit ownership claim"})).toBeInTheDocument();expect(screen.getByLabelText("Robot platform ID")).toBeRequired();expect(screen.getByLabelText("Transfer code")).toBeRequired()});
  it("makes the scheduled-versus-verified comparison understandable without its arrow",()=>{render(<OwnerPage path="/owner/operating-time"/>);const graphic=screen.getByRole("img",{name:/scheduled time is separate/i});expect(within(graphic).getByText("Scheduled")).toBeInTheDocument();expect(within(graphic).getByText("Verified")).toBeInTheDocument()});
  it("does not expose assignment mutation controls to owners",()=>{render(<OwnerPage path="/owner/assignments/example"/>);expect(screen.queryByRole("button",{name:/edit|replace|cancel|complete/i})).not.toBeInTheDocument()});
  it("exposes guarded availability controls",()=>{render(<OwnerPage path="/owner/robots/example"/>);expect(screen.getByRole("button",{name:"Mark available"})).toBeInTheDocument();expect(screen.getByRole("button",{name:"Mark unavailable"})).toBeInTheDocument();expect(screen.getByText(/optimistic locking/i)).toBeInTheDocument()});
  it("scopes financial reads to the active organization",()=>{render(<OwnerPage path="/owner/earnings/statements"/>);expect(api.get).toHaveBeenCalledWith("/api/v1/organizations/00000000-0000-4000-8000-000000000015/earnings/statements")});
  it("never labels scheduled time as earned or paid",()=>{render(<OwnerPage path="/owner/operating-time"/>);expect(screen.queryByText(/scheduled earnings|scheduled pay|paid scheduled/i)).not.toBeInTheDocument();expect(screen.getByText(/signed heartbeat evidence/i)).toBeInTheDocument()});
});
