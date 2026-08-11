import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("./auth-client.js", () => ({ api: { get: vi.fn((path: string) => Promise.resolve(path.endsWith("overview") ? { launch_blockers: 3, open_gaps: 5, active_waivers: 0, last_run: { status: "blocked", started_at: "2026-08-04T00:00:00Z" } } : { items: [] })) } }));
import { AcceptancePage } from "./AcceptancePage.js";
describe("AcceptancePage", () => { it("does not equate an empty register with acceptance", async () => { render(<AcceptancePage />); expect(await screen.findByText("3")).toBeInTheDocument(); expect(screen.getByText(/does not mean acceptance passed/i)).toBeInTheDocument(); }); });
