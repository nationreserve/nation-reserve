// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketplacePage } from "./MarketplacePages.js";
import { api } from "./auth-client.js";

vi.mock("./auth-client.js", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  sessionStorage.setItem(
    "nr-active-organization",
    "00000000-0000-4000-8000-000000000001",
  );
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("manufacturer discovery and messaging UI", () => {
  it("searches approved manufacturers and links to profiles", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: "m1",
          displayName: "Test Robotics",
          description: "Warehouse robots",
          integrationStatus: "production_enabled",
          modelCount: 2,
        },
      ],
    });
    render(<MarketplacePage path="/company/manufacturers" />);
    expect(
      await screen.findByRole("heading", { name: "Test Robotics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View manufacturer profile" }),
    ).toHaveAttribute("href", "/company/manufacturers/m1");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "warehouse" } });
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        expect.stringContaining("search=warehouse"),
      ),
    );
  });

  it("shows persistent conversation history and sends idempotent replies", async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: "c1",
      subject: "Deployment",
      contexts: [],
      messages: [
        {
          id: "x1",
          body: "Can you support this task?",
          createdAt: "2026-08-10T12:00:00Z",
          senderName: "Test Company",
          sentByMe: false,
        },
      ],
    });
    vi.mocked(api.post).mockResolvedValue({ id: "x2" });
    render(<MarketplacePage path="/manufacturer/conversations/c1" />);
    expect(await screen.findByText("Can you support this task?")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reply"), {
      target: { value: "Yes, let’s review the model." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        { message: "Yes, let’s review the model." },
        expect.objectContaining({ "Idempotency-Key": expect.any(String) }),
      ),
    );
  });

  it("renders a useful empty state rather than a mock success", async () => {
    vi.mocked(api.get).mockResolvedValue({ items: [] });
    render(<MarketplacePage path="/manufacturer/conversations" />);
    expect(
      await screen.findByRole("heading", { name: "No conversations yet" }),
    ).toBeInTheDocument();
  });
});
