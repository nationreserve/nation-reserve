// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen,within} from "@testing-library/react";
import {CompanyPage} from "./CompanyPages.js";
vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));afterEach(()=>cleanup());
describe("Prompt 016 accessibility structure",()=>{
 it("provides one page heading and contextual explanation",()=>{for(const path of ["/company/dashboard","/company/jobs/job/responsibilities","/company/training/equipment","/company/opportunities","/company/live-operations","/company/invoices"]){const view=render(<CompanyPage path={path}/>);expect(screen.getAllByRole("heading",{level:1})).toHaveLength(1);expect(screen.getByRole("heading",{name:"What this page is about"})).toBeInTheDocument();view.unmount()}});
 it("gives the live visualization a non-color accessible description",()=>{render(<CompanyPage path="/company/dashboard"/>);const graphic=screen.getByRole("img",{name:/scheduled, verified online/i});expect(within(graphic).getByText(/Verified online:/)).toBeInTheDocument();expect(within(graphic).getByText(/Offline:/)).toBeInTheDocument()});
 it("makes the responsibility tree keyboard focusable",()=>{render(<CompanyPage path="/company/jobs/job/responsibilities"/>);expect(screen.getByRole("tree",{name:"Job responsibility hierarchy"})).toBeInTheDocument();for(const node of screen.getAllByRole("treeitem"))expect(node).toHaveAttribute("tabindex","0")});
 it("labels dashboard filters",()=>{render(<CompanyPage path="/company/dashboard"/>);expect(screen.getByLabelText("Facility scope")).toBeInTheDocument();expect(screen.getByLabelText("Department filter")).toBeInTheDocument();expect(screen.getByLabelText("Date range")).toBeInTheDocument()});
});
