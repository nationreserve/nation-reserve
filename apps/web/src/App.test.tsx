import type { HealthResponse, ReadinessResponse } from "@nation-reserve/types";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.js";

const health: HealthResponse = {
  status: "ok",
  service: "api",
  timestamp: "2026-01-01T00:00:00.000Z",
};

const ready: ReadinessResponse = {
  status: "ready",
  dependencies: {
    postgres: "up",
    redis: "up",
    objectStorage: "up",
  },
  timestamp: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the initial status interface and loading state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    render(<App />);

    expect(screen.getByRole("heading", { name: "RoboWorkPool" })).toBeInTheDocument();
    expect(screen.getByText("Nation Reserve")).toBeInTheDocument();
    expect(screen.getByText("Checking services...")).toBeInTheDocument();
  });

  it("renders a healthy state when API checks succeed", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(health))
        .mockResolvedValueOnce(jsonResponse(ready)),
    );
    render(<App />);

    await waitFor(() => expect(screen.getByText("Healthy")).toBeInTheDocument());
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getAllByText("up")).toHaveLength(3);
  });

  it("renders a degraded state when readiness fails", async () => {
    const degraded: ReadinessResponse = {
      ...ready,
      status: "not_ready",
      dependencies: { ...ready.dependencies, redis: "down" },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(health))
        .mockResolvedValueOnce(jsonResponse(degraded, 503)),
    );
    render(<App />);

    await waitFor(() => expect(screen.getByText("Degraded")).toBeInTheDocument());
    expect(screen.getByText("down")).toBeInTheDocument();
  });
});
