// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {CompanyPage} from "./CompanyPages.js";
vi.mock("./auth-client.js",()=>({api:{get:vi.fn().mockResolvedValue({items:[]}),post:vi.fn()}}));afterEach(()=>cleanup());
describe("Prompt 016 responsive coverage",()=>{for(const width of [360,390,768,1024,1440])it(`keeps critical company actions reachable at ${width}px`,()=>{Object.defineProperty(window,"innerWidth",{configurable:true,value:width});render(<CompanyPage path="/company/dashboard"/>);expect(screen.getByRole("link",{name:"Plan robot work"})).toBeVisible();expect(screen.getByRole("link",{name:"View live operations"})).toBeVisible();expect(screen.getByLabelText("Facility scope")).toBeVisible()})});
