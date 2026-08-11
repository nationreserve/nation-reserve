// @vitest-environment jsdom
import { render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { AuthenticatedShell,developmentSessions,OrganizationProvider } from "@nation-reserve/application-shell";
describe("Prompt 012 responsive foundation",()=>{for(const width of [360,390,768,1024,1440])it(`keeps navigation reachable at ${width}px`,()=>{Object.defineProperty(window,"innerWidth",{configurable:true,value:width});render(<OrganizationProvider initial={developmentSessions.owner!}><AuthenticatedShell><h1>Owner overview</h1></AuthenticatedShell></OrganizationProvider>);expect(screen.getByRole("button",{name:/Open navigation/})).toBeInTheDocument();expect(screen.getByRole("navigation",{name:"Primary"})).toBeInTheDocument()})});
