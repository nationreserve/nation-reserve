import { render,screen } from "@testing-library/react";
import { afterEach,describe,expect,it,vi } from "vitest";
import { ContractPage } from "./ContractPages.js";
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});
describe("Prompt 005 dashboards",()=>{
  it("shows contract lifecycle filters and no-pay explanation",()=>{
    render(<ContractPage path="/company/contracts"/>);
    expect(screen.getByRole("button",{name:"Partially Fulfilled"})).toBeInTheDocument();
    expect(screen.getByText(/zero payable time/i)).toBeInTheDocument();
  });
  it("shows requested, allocated, and remaining fulfillment",()=>{
    render(<ContractPage path="/manufacturer/contracts/00000000-0000-4000-8000-000000000001/allocation"/>);
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Allocated")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
  });
});

