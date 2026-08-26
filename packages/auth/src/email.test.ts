import { describe, expect, it, vi } from "vitest";
import {
  DevelopmentEmailAdapter,
  ResendEmailAdapter,
  createAuthEmailAdapter,
} from "./email.js";

const expiresAt = new Date("2026-08-20T12:00:00.000Z");

describe("authentication email adapters", () => {
  it("keeps the development adapter outside production", () => {
    expect(createAuthEmailAdapter({ NODE_ENV: "development" })).toBeInstanceOf(
      DevelopmentEmailAdapter,
    );
    expect(createAuthEmailAdapter({ NODE_ENV: "test" })).toBeInstanceOf(
      DevelopmentEmailAdapter,
    );
  });

  it("requires protected Resend configuration in production", () => {
    expect(() =>
      createAuthEmailAdapter({
        NODE_ENV: "production",
        WEB_ORIGIN: "https://nationreserve.com",
      }),
    ).toThrow("RESEND_API_KEY is required");
  });

  it("selects Resend and constructs all four requests", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    const adapter = createAuthEmailAdapter(
      {
        NODE_ENV: "production",
        WEB_ORIGIN: "https://nationreserve.com",
        RESEND_API_KEY: "re_production_test_key_123456789",
        RESEND_FROM_EMAIL: "no-reply@mail.nationreserve.com",
      },
      request,
    );
    expect(adapter).toBeInstanceOf(ResendEmailAdapter);

    await adapter.sendEmailVerification({
      to: "owner@example.com",
      token: "verification-token",
      expiresAt,
    });
    await adapter.sendPasswordReset({
      to: "owner@example.com",
      token: "reset-token",
      expiresAt,
    });
    await adapter.sendOrganizationInvitation({
      to: "owner@example.com",
      token: "invitation-token",
      expiresAt,
      organizationName: "Example Robotics",
    });
    await adapter.sendSecurityNotice({
      to: "owner@example.com",
      expiresAt,
      summary: "A new device signed in.",
    });

    expect(request).toHaveBeenCalledTimes(4);
    const [endpoint, init] = request.mock.calls[0]!;
    expect(endpoint).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer re_production_test_key_123456789",
      "Content-Type": "application/json",
    });
    const verification = JSON.parse(String(init?.body)) as {
      from: string;
      to: string[];
      subject: string;
      html: string;
    };
    expect(verification).toMatchObject({
      from: "no-reply@mail.nationreserve.com",
      to: ["owner@example.com"],
      subject: "Verify your RoboWorkPool account",
    });
    expect(verification.html).toContain(
      "https://nationreserve.com/verify-email?token=verification-token",
    );

    const invitation = JSON.parse(String(request.mock.calls[2]![1]?.body)) as {
      subject: string;
      html: string;
    };
    expect(invitation.subject).toBe("Invitation to Example Robotics");
    expect(invitation.html).toContain(
      "https://nationreserve.com/accept-invitation?token=invitation-token",
    );
    const security = JSON.parse(String(request.mock.calls[3]![1]?.body)) as {
      html: string;
    };
    expect(security.html).not.toContain("token=");
  });

  it("fails closed when Resend rejects delivery", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const adapter = new ResendEmailAdapter({
      apiKey: "re_production_test_key_123456789",
      from: "no-reply@mail.nationreserve.com",
      applicationUrl: "https://nationreserve.com",
      fetchImplementation: request,
    });
    await expect(
      adapter.sendPasswordReset({
        to: "owner@example.com",
        token: "reset-token",
        expiresAt,
      }),
    ).rejects.toThrow("status 401");
  });
});
