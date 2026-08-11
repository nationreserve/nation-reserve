// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent,render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { Button,DataTable,FeeBreakdown,FormField,MoneyAmount,StatusBadge,statuses } from "./index.js";
describe("design system foundation",()=>{
  it("keeps precise financial terminology and formatting",()=>{render(<><StatusBadge status="payment.submitted"/><MoneyAmount minorUnits={425}/><FeeBreakdown/></>);expect(screen.getByText("Submitted")).toBeInTheDocument();expect(screen.queryByText(/^Paid$/)).not.toBeInTheDocument();expect(screen.getAllByText("$4.25").length).toBeGreaterThan(0)});
  it("connects descriptive form content",()=>{render(<FormField label="Organization" description="Legal name" error="Enter a legal name"><input aria-label="Organization"/></FormField>);expect(screen.getByRole("alert")).toHaveTextContent("Enter a legal name")});
  it("renders keyboard-operable controls and semantic tables",()=>{let used=false;render(<><Button onClick={()=>{used=true}}>Continue</Button><DataTable caption="Robots" columns={[{key:"name",label:"Robot",render:(row:{name:string})=>row.name}]} rows={[{name:"RWP-R-1"}]} getKey={row=>row.name}/></>);fireEvent.click(screen.getByRole("button",{name:"Continue"}));expect(used).toBe(true);expect(screen.getByRole("columnheader",{name:"Robot"})).toBeInTheDocument()});
  it("provides non-color status text",()=>{expect(statuses["payout.processing"]?.displayLabel).toBe("Payout processing");render(<StatusBadge status="robot.offline"/>);expect(screen.getByText("Offline")).toBeVisible()});
});
