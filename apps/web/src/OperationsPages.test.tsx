import { render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { OperationsPage } from "./OperationsPages.js";
describe("operations UI",()=>{
  it("never labels verified operating time as paid",()=>{
    render(<OperationsPage path="/platform/heartbeat"/>);
    expect(screen.getByText(/Verified operating time is evidence-backed/)).toBeInTheDocument();
    expect(screen.queryByText(/paid hours/i)).not.toBeInTheDocument();
  });
  it("explains company reports trigger review",()=>{
    sessionStorage.setItem("currentOrganizationId",crypto.randomUUID());
    render(<OperationsPage path="/company/operations"/>);
    expect(screen.getByText(/does not erase verified time/)).toBeInTheDocument();
  });
});
