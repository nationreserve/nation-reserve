// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSharedAccountRoute, SharedAccountPage } from "./AccountPages.js";

function response(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
describe("Prompt 014 shared account UI", () => {
  beforeEach(() => {
    history.replaceState({}, "", "/");
    vi.restoreAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });
  it("registers every shared route", () => {
    for (const path of [
      "/login",
      "/register",
      "/register/success",
      "/verify-email",
      "/verify-email/pending",
      "/verify-email/complete",
      "/forgot-password",
      "/reset-password",
      "/invitation",
      "/accept-invitation",
      "/logout",
      "/organizations/select",
      "/organizations/create",
      "/account",
      "/account/profile",
      "/account/security",
      "/account/sessions",
      "/account/preferences",
      "/account/organizations",
      "/account/notifications",
      "/account/delete",
    ])
      expect(isSharedAccountRoute(path), path).toBe(true);
  });
  it("collects only shared account fields and validates matching passwords", () => {
    render(<SharedAccountPage path="/register" />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.queryByLabelText(/Organization legal name/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Password (12 or more characters)"), {
      target: { value: "long-password-value" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  });
  it("persists account-only registration before organization choice", async () => {
    const fetch = vi.fn(() => response({ userId: "user-1" }, 201));
    vi.stubGlobal("fetch", fetch);
    render(<SharedAccountPage path="/register" />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test Person" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password (12 or more characters)"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "correct horse battery staple" },
    });
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/register"),
      expect.objectContaining({ method: "POST" }),
    );
  });
  it("keeps password recovery enumeration-safe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response({ accepted: true }, 202)),
    );
    render(<SharedAccountPage path="/forgot-password" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "unknown@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/If the account is eligible/)).toBeInTheDocument();
  });
  it("shows role and organization details returned by the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        response([
          {
            id: "11111111-1111-4111-8111-111111111111",
            displayName: "Atlas Robotics",
            type: "robot_owner",
            role: "administrator",
            status: "active",
            lastAccessedAt: "2026-08-01",
          },
        ]),
      ),
    );
    render(<SharedAccountPage path="/organizations/select" />);
    expect(await screen.findByText("Atlas Robotics")).toBeInTheDocument();
    expect(screen.getByText("robot owner")).toBeInTheDocument();
    expect(screen.getByText("administrator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter" })).toBeInTheDocument();
  });
  it("renders sessions and protects current-session revocation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        response([
          {
            id: "session-current",
            userAgent: "Test Browser",
            ipAddress: "Approximate region",
            lastSeenAt: "Now",
            current: true,
            status: "active",
          },
        ]),
      ),
    );
    render(<SharedAccountPage path="/account/sessions" />);
    expect(await screen.findByText("Test Browser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeDisabled();
    expect(screen.getByRole("table", { name: "Account sessions" })).toBeInTheDocument();
  });
  it("warns before account deletion without pretending to delete", () => {
    render(<SharedAccountPage path="/account/delete" />);
    fireEvent.click(screen.getByRole("button", { name: "Request account deletion" }));
    expect(
      screen.getByRole("dialog", {
        name: "Request account deletion?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/30-day recovery window/i)).toBeInTheDocument();
  });
  it("requests a safe invitation preview without revealing the token", () => {
    history.replaceState({}, "", "/accept-invitation?token=" + "s".repeat(40));
    render(<SharedAccountPage path="/accept-invitation" />);
    expect(screen.getByRole("button", { name: "Accept invitation" })).toBeEnabled();
    expect(document.body.textContent).not.toContain("s".repeat(40));
  });
  it("persists accessible presentation preferences", () => {
    render(<SharedAccountPage path="/account/preferences" />);
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "dark" } });
    fireEvent.change(screen.getByLabelText("Density"), {
      target: { value: "compact" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("nr-density")).toBe("compact");
  });
  it("normalizes server authentication errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        response(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Internal detail",
              requestId: "req",
            },
          },
          401,
        ),
      ),
    );
    render(<SharedAccountPage path="/login" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email or password is invalid",
      ),
    );
    expect(screen.queryByText("Internal detail")).not.toBeInTheDocument();
  });
});
