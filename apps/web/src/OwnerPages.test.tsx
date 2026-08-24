import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {OwnerPage,isOwnerRoute} from "./OwnerPages.js";
import {api} from "./auth-client.js";
vi.mock("./auth-client.js",()=>({api:{get:vi.fn(),post:vi.fn()}}));
const get=vi.mocked(api.get),post=vi.mocked(api.post);
beforeEach(()=>{sessionStorage.setItem("nr-active-organization","00000000-0000-4000-8000-000000000015");get.mockResolvedValue({items:[]});post.mockResolvedValue({});});afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("Prompt 015 Robot Owner portal",()=>{
  it("recognizes every owner route family",()=>{expect(isOwnerRoute("/owner")).toBe(true);expect(isOwnerRoute("/owner/earnings/statements/one")).toBe(true);expect(isOwnerRoute("/company")).toBe(false)});
  it("renders dashboard terminology without treating unavailable data as zero",()=>{render(<OwnerPage path="/owner/dashboard"/>);expect(screen.getByText("Robot Owner dashboard")).toBeInTheDocument();expect(screen.getByText("Financially ready")).toBeInTheDocument();expect(screen.getByText(/dash means/i)).toBeInTheDocument()});
  it("renders connected robot inventory filters and loading state",()=>{render(<OwnerPage path="/owner/robots"/>);expect(screen.getByLabelText("Search by serial number")).toBeInTheDocument();expect(screen.getByRole("status")).toHaveTextContent(/Loading/i)});
  it("submits ownership claims through the existing backend contract",async()=>{render(<OwnerPage path="/owner/robots/new"/>);fireEvent.change(screen.getByLabelText("Robot platform ID"),{target:{value:"robot-15"}});fireEvent.change(screen.getByLabelText("Transfer code"),{target:{value:"transfer-15"}});fireEvent.click(screen.getByRole("button",{name:"Submit ownership claim"}));expect(post).toHaveBeenCalledWith("/api/v1/owner/robots/robot-15/claim",{transferCode:"transfer-15"})});
  it("keeps assignments read only",()=>{render(<OwnerPage path="/owner/assignments"/>);expect(screen.getByText(/cannot edit assignments/i)).toBeInTheDocument();expect(screen.queryByRole("button",{name:/cancel/i})).not.toBeInTheDocument()});
  it("distinguishes scheduled and verified operating time",()=>{render(<OwnerPage path="/owner/operating-time"/>);expect(screen.getByText("Scheduled")).toBeInTheDocument();expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);expect(screen.getByText(/signed heartbeat evidence/i)).toBeInTheDocument()});
  it("uses backend financial APIs and distinguishes statements from payouts",()=>{render(<OwnerPage path="/owner/earnings/statements"/>);expect(get).toHaveBeenCalledWith(expect.stringContaining("/earnings/statements"));expect(screen.getByText(/Statements are not payouts/i)).toBeInTheDocument()});
  it("explains holds in plain language",()=>{render(<OwnerPage path="/owner/earnings/holds"/>);expect(screen.getByText(/temporarily prevents an amount/i)).toBeInTheDocument()});
  it("guards payout onboarding behind confirmation",()=>{render(<OwnerPage path="/owner/payouts/setup"/>);fireEvent.click(screen.getByRole("button",{name:"Begin secure payout setup"}));expect(screen.getByText("Continue to secure payout setup?")).toBeInTheDocument();expect(post).not.toHaveBeenCalled()});
  it("provides notification deep links",()=>{render(<OwnerPage path="/owner/notifications"/>);expect(screen.getByRole("link",{name:"Payout completed"})).toHaveAttribute("href","/owner/payouts/history");expect(screen.getByRole("link",{name:"Hold placed"})).toHaveAttribute("href","/owner/earnings/holds")});
  it("routes reports into shared reporting infrastructure",()=>{render(<OwnerPage path="/owner/reports"/>);expect(screen.getAllByRole("link",{name:"Configure report"})[0]!).toHaveAttribute("href",expect.stringContaining("/reports?"))});
});

