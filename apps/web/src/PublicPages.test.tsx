// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isPublicRoute, PublicPage, publicRoutes } from "./PublicPages.js";

describe("Prompt 013 public website", () => {
  it("registers every authoritative public route", () => {
    for (const route of [
      "/",
      "/roboworkpool",
      "/roboworkpool/how-it-works",
      "/roboworkpool/robot-owners",
      "/roboworkpool/hiring-companies",
      "/roboworkpool/manufacturers",
      "/roboworkpool/heartbeat-api",
      "/roboworkpool/pricing",
      "/roboworkpool/downpayment-queue",
      "/roboworkpool/trust-and-verification",
      "/roboworkpool/faq",
      "/about",
      "/contact",
      "/support",
      "/status",
      "/privacy",
      "/terms",
      "/accessibility",
      "/legal/cookies",
      "/legal/acceptable-use",
      "/legal/manufacturer-api-terms",
    ])
      expect(isPublicRoute(route), route).toBe(true);
    expect(publicRoutes.length).toBeGreaterThanOrEqual(21);
  });
  it("orients first-time Hiring Company visitors", () => {
    render(<PublicPage path="/roboworkpool/hiring-companies" />);
    expect(screen.getByText("What this page is about")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Plan robot labor/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create a Hiring Company account" }),
    ).toHaveAttribute("href", "/register/hiring-company");
  });
  it("keeps scheduled, verified, accrued, and paid distinct on pricing", () => {
    render(<PublicPage path="/roboworkpool/pricing" />);
    expect(screen.getByText(/Planned work time/)).toBeInTheDocument();
    expect(screen.getByText(/supported by heartbeat evidence/)).toBeInTheDocument();
    expect(
      screen.getByText(/not necessarily invoiced, settled, or paid/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/External payout has been confirmed completed/),
    ).toBeInTheDocument();
  });
  it("searches FAQ content without exposing private records", () => {
    render(<PublicPage path="/roboworkpool/faq" />);
    const input = screen.getByRole("searchbox", { name: "Search public questions" });
    fireEvent.change(input, { target: { value: "separate tracking hardware" } });
    expect(
      screen.getByText("Does RoboWorkPool require a separate tracking device?"),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "private contract 999" } });
    expect(
      screen.getByText(/Public search never includes accounts, robots, contracts/),
    ).toBeInTheDocument();
  });
  it("does not pretend an unavailable queue program accepts money", () => {
    render(<PublicPage path="/roboworkpool/downpayment-queue" />);
    expect(
      screen.getByRole("button", { name: /Join Downpayment Queue/ }),
    ).toBeDisabled();
    expect(screen.getAllByText(/not an investment/).length).toBeGreaterThan(0);
  });
  it("sets unique public metadata and structured FAQ data", () => {
    render(<PublicPage path="/roboworkpool/faq" />);
    expect(document.title).toMatch(/RoboWorkPool FAQ/);
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toMatch(/Search answers/);
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toMatch(/\/roboworkpool\/faq$/);
    expect(document.querySelector("#nr-public-structured-data")?.textContent).toContain(
      "FAQPage",
    );
  });
  it("keeps unresolved contact delivery honest", () => {
    render(<PublicPage path="/contact" />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test Visitor" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "visitor@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Contact category"), {
      target: { value: "Billing" },
    });
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Question" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "A safe test question" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Prepare contact request" }));
    expect(screen.getByText(/No message was transmitted/)).toBeInTheDocument();
  });
  it("renders public error recovery without internal details", () => {
    render(<PublicPage path="/errors/503" />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Temporarily unavailable/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/RWP-PUBLIC-503/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/stack trace|node_modules/i);
  });
});
