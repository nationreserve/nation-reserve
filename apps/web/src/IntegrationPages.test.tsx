import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationPage } from "./IntegrationPages.js";

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("Prompt 004 dashboards", () => {
  it("warns that credentials are displayed only once", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    render(<IntegrationPage path="/manufacturer/credentials" />);
    expect(screen.getByText(/Secrets appear once/i)).toBeInTheDocument();
  });

  it("shows every activation readiness check and the nonpayable warning", () => {
    render(<IntegrationPage path="/manufacturer/activation" />);
    expect(screen.getByText("Owner verified")).toBeInTheDocument();
    expect(screen.getByText(/creates no work or pay/i)).toBeInTheDocument();
    expect(screen.getAllByText("pending")).toHaveLength(10);
  });

  it("renders independent robot state dimensions", async () => {
    const robot = {
      registration_state: "registered",
      ownership_state: "ownership_verified",
      activation_state: "activated",
      heartbeat_state: "never_connected",
      operational_state: "available",
      maintenance_state: "no_maintenance",
      compliance_state: "eligible",
      financial_eligibility_state: "not_payable",
      final_lifecycle_state: "active",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(robot), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    render(
      <IntegrationPage path="/owner/robots/00000000-0000-4000-8000-000000000603" />,
    );
    await waitFor(() => expect(screen.getAllByText("not_payable")).not.toHaveLength(0));
    expect(screen.getAllByText("never_connected")).not.toHaveLength(0);
    expect(screen.getAllByText("activated")).not.toHaveLength(0);
  });
});
