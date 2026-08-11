// @vitest-environment jsdom
import { render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { AuthenticationShell,PublicShell } from "@nation-reserve/application-shell";
describe("Prompt 012 accessibility structure",()=>{it("provides skip links and main landmark",()=>{render(<PublicShell><h1>RoboWorkPool</h1></PublicShell>);expect(screen.getByRole("link",{name:"Skip to main content"})).toHaveAttribute("href","#main-content");expect(screen.getByRole("main")).toHaveAttribute("id","main-content")});it("authentication shell has one meaningful heading and labeled help navigation",()=>{render(<AuthenticationShell title="Log in"><label>Email<input type="email"/></label></AuthenticationShell>);expect(screen.getByRole("heading",{level:1,name:"Log in"})).toBeInTheDocument();expect(screen.getByRole("navigation",{name:"Account help"})).toBeInTheDocument()})});
