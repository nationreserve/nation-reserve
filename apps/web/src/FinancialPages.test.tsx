import{render,screen}from"@testing-library/react";import{describe,expect,it}from"vitest";
import{FinancialPage}from"./FinancialPages.js";
describe("financial UI",()=>{it("does not label owner statements as paid",()=>{
  sessionStorage.setItem("currentOrganizationId",crypto.randomUUID());render(<FinancialPage path="/owner/earnings"/>);
  expect(screen.getByText(/Gross earnings, platform fee, net earnings/)).toBeInTheDocument();
  expect(screen.queryByText(/payout completed/i)).not.toBeInTheDocument();});
  it("warns platform staff that settlement execution is disconnected",()=>{
    render(<FinancialPage path="/platform/financial/settlement-batches"/>);
    expect(screen.getByText("External payment execution is not connected.")).toBeInTheDocument();
    expect(screen.queryByText(/send payments/i)).not.toBeInTheDocument();});});
