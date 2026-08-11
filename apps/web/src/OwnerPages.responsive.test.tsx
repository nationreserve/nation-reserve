// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {OwnerPage} from "./OwnerPages.js";
vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));
afterEach(()=>cleanup());
describe("Prompt 015 responsive route coverage",()=>{for(const width of [320,375,768,1024,1440])it(`keeps the dashboard and robot actions reachable at ${width}px`,()=>{Object.defineProperty(window,"innerWidth",{configurable:true,value:width});const dashboard=render(<OwnerPage path="/owner/dashboard"/>);expect(screen.getByRole("heading",{name:"Robot Owner dashboard"})).toBeVisible();expect(screen.getByRole("link",{name:"Finish payout setup"})).toBeVisible();dashboard.unmount();render(<OwnerPage path="/owner/robots"/>);expect(screen.getByRole("link",{name:"Claim a robot"})).toBeVisible();expect(screen.getByLabelText("Search by serial number")).toBeVisible()})});
