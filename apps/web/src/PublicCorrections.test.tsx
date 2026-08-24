// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicPage } from "./PublicPages.js";
import { isExpansionRoute } from "./route-predicates.js";

afterEach(() => cleanup());

describe("public participant and workflow correction", () => {
  it("uses the canonical three participant paths on the homepage", () => {
    render(<PublicPage path="/" />);
    expect(screen.getByRole("link", { name: "Own robots & earn" })).toHaveAttribute(
      "href",
      "/roboworkpool/robot-owners",
    );
    expect(
      screen.getAllByRole("link", { name: "Automate my company" })[0],
    ).toHaveAttribute("href", "/roboworkpool/hiring-companies");
    expect(
      screen.getAllByRole("link", { name: "Sell robots through RoboWorkPool" })[0],
    ).toHaveAttribute("href", "/roboworkpool/manufacturers");
    expect(
      screen.queryByRole("link", { name: /training demonstration/i }),
    ).not.toBeInTheDocument();
  });
  it("does not let the legacy expansion page intercept the homepage", () =>
    expect(isExpansionRoute("/")).toBe(false));
  it("places training demonstrations under the Hiring Company workflow", () => {
    render(<PublicPage path="/roboworkpool/hiring-companies" />);
    expect(
      screen.getByRole("heading", { name: "Training-demonstration coordination" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /does not create a training-worker role, wage, payroll, or payout/i,
      ),
    ).toBeInTheDocument();
  });
  it("provides complete manufacturer public actions", () => {
    render(<PublicPage path="/roboworkpool/manufacturers" />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Supply connected robots/ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Create Manufacturer Account" })[0],
    ).toHaveAttribute("href", "/register/manufacturer");
    expect(
      screen.getByRole("link", { name: "View Integration Process" }),
    ).toHaveAttribute("href", "/manufacturer/heartbeat-integration");
  });
  it("renders eight correctly capitalized financial states in a balanced grid", () => {
    render(<PublicPage path="/roboworkpool/pricing" />);
    const section = screen
      .getByRole("heading", { name: "Financial language matters" })
      .closest("section")!;
    expect(section.querySelector(".public-card-grid--8")).toBeTruthy();
    for (const label of [
      "Scheduled",
      "Verified",
      "Accrued",
      "Invoiced",
      "Settled",
      "Financially Ready",
      "Ready for Payout",
      "Paid",
    ])
      expect(within(section).getByRole("heading", { name: label })).toBeInTheDocument();
  });
  it("documents private chronological queue-to-ownership traceability", () => {
    render(<PublicPage path="/roboworkpool/downpayment-queue" />);
    expect(
      screen.getByText(/other participants personal information remains private/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /rejects robot ordering above the contract approved normal concurrent requirement/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Queue position, purchase order, manufacturer fulfillment, robot serial identifier, ownership allocation, and contract assignment remain linked/i,
      ),
    ).toBeInTheDocument();
  });
});
