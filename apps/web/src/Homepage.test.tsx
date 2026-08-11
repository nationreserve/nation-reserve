// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicPage } from "./PublicPages.js";

afterEach(cleanup);

describe("RoboWorkPool conversion homepage", () => {
  it("leads with the compact product message and all three public benefit paths", () => {
    render(<PublicPage path="/" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "The workforce. Reconnected." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Automate work. Own productive robots. Sell more robots."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Automate my company" })[0],
    ).toHaveAttribute("href", "/roboworkpool/hiring-companies");
    expect(screen.getByRole("link", { name: "Own robots & earn" })).toHaveAttribute(
      "href",
      "/roboworkpool/robot-owners",
    );
    expect(
      screen.getAllByRole("link", { name: "Sell robots through RoboWorkPool" })[0],
    ).toHaveAttribute("href", "/roboworkpool/manufacturers");
  });

  it("makes each participant's commercial reason public", () => {
    render(<PublicPage path="/" />);
    expect(
      screen.getByRole("heading", { name: "Own robots that can work for you." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Automate without buying the whole fleet." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sell more robots into the workforce." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/passive-income potential from productive robots/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/less upfront equipment cost/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/real labor demand/)).toBeInTheDocument();
  });

  it("keeps training demonstrations under company and manufacturer coordination", () => {
    render(<PublicPage path="/" />);
    const section = screen
      .getByRole("heading", {
        name: "Need human demonstrations? We’ll guide the setup.",
      })
      .closest("div")!;
    expect(
      within(section).getByText(/manufacturer defines the requirements/),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /training-data wages|training worker payout/i,
    );
  });

  it("does not promote unrelated Nation Reserve products or documentation-style orientation", () => {
    render(<PublicPage path="/" />);
    expect(screen.queryByText("Republic")).not.toBeInTheDocument();
    expect(screen.queryByText("Med Pool")).not.toBeInTheDocument();
    expect(screen.queryByText("What this page is about")).not.toBeInTheDocument();
  });

  it("ends with registration destinations for each canonical participant", () => {
    render(<PublicPage path="/" />);
    expect(screen.getByRole("link", { name: /Explore ownership/ })).toHaveAttribute(
      "href",
      "/register/robot-owner",
    );
    expect(
      screen
        .getAllByRole("link", { name: "Hire robots" })
        .some((link) => link.getAttribute("href") === "/register/hiring-company"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "Sell robots" })
        .some((link) => link.getAttribute("href") === "/register/manufacturer"),
    ).toBe(true);
  });
});
