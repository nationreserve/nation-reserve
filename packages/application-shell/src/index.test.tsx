// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { AuthenticatedShell,AuthenticationShell,developmentSessions,evaluateRouteGuard,OrganizationProvider,organizationCacheKey,PublicShell,visibleNavigation } from "./index.js";
describe("application shell",()=>{
 it("separates public and authentication navigation",()=>{const {unmount}=render(<PublicShell><h1>Public</h1></PublicShell>);expect(screen.getByRole("navigation",{name:"Product navigation"})).toBeInTheDocument();unmount();render(<AuthenticationShell title="Log in"><form/></AuthenticationShell>);expect(screen.queryByRole("navigation",{name:"Primary"})).not.toBeInTheDocument()});
 it("filters role and platform navigation",()=>{expect(visibleNavigation([],developmentSessions.owner!)).toEqual([]);expect(visibleNavigation((awaitRegistry()),developmentSessions.owner!).some(i=>i.label==="Earnings")).toBe(true);expect(visibleNavigation((awaitRegistry()),developmentSessions.owner!).some(i=>i.label==="Security")).toBe(false)});
 it("shows active organization and role",()=>{render(<OrganizationProvider initial={developmentSessions.company!}><AuthenticatedShell><h1>Operations</h1></AuthenticatedShell></OrganizationProvider>);expect(screen.getByText("Hiring Company Operations")).toBeInTheDocument();expect(screen.getByRole("combobox")).toHaveValue("org-company")});
 it("evaluates explicit guard outcomes",()=>{expect(evaluateRouteGuard(null,{authenticated:true})).toBe("login");expect(evaluateRouteGuard(developmentSessions.owner!,{permission:"platform:security:read"})).toBe("restricted");expect(evaluateRouteGuard({...developmentSessions.owner!,maintenance:["payments"]},{maintenanceSubsystem:"payments"})).toBe("maintenance")});
 it("isolates cache keys by organization",()=>{const owner={...developmentSessions.owner!,cacheEpoch:0,switchOrganization:()=>{}};const company={...developmentSessions.company!,cacheEpoch:0,switchOrganization:()=>{}};expect(organizationCacheKey(owner,"robots")).not.toEqual(organizationCacheKey(company,"robots"))});
});
import { navigationRegistry } from "./index.js";
function awaitRegistry(){return navigationRegistry}
