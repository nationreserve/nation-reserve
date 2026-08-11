// @vitest-environment jsdom
import { render,screen } from "@testing-library/react";
import { beforeEach,describe,expect,it } from "vitest";
import { PlatformApp } from "./PlatformApp.js";
describe("Prompt 012 web shell integration",()=>{beforeEach(()=>history.replaceState({},"","/"));it("renders the public Nation Reserve product shell",()=>{render(<PlatformApp/>);expect(screen.getAllByText("Nation Reserve",{selector:"span"}).length).toBeGreaterThan(0);expect(screen.getByRole("navigation",{name:"Product navigation"})).toBeInTheDocument()});it("renders platform context only on platform routes",()=>{history.replaceState({},"","/platform");render(<PlatformApp/>);expect(screen.getByText("Production environment")).toBeInTheDocument();expect(screen.getByText("Platform Administrator")).toBeInTheDocument()})});
