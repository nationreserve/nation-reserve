import { afterEach, describe, expect, it, vi } from "vitest";
import { StripePaymentProvider } from "./stripe-provider.js";

afterEach(() => vi.unstubAllGlobals());

describe("Stripe Identity adapter", () => {
  it("constructs a hosted document verification session without raw identity data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "vs_live_123",
          url: "https://verify.stripe.com/start/test",
          status: "requires_input",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new StripePaymentProvider(
      "live",
      "sk_live_not_a_real_key",
      "whsec_platform_test_value",
      "whsec_connect_test_value",
    );

    const result = await provider.createIdentityVerificationSession({
      userId: "00000000-0000-4000-8000-000000000123",
      returnUrl: "https://nationreserve.com/account/verification",
      idempotencyKey: "identity-user-123",
    });

    expect(result).toEqual({
      id: "vs_live_123",
      url: "https://verify.stripe.com/start/test",
      status: "requires_input",
    });
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/identity/verification_sessions");
    expect(request.method).toBe("POST");
    expect(request.headers).toMatchObject({
      authorization: "Bearer sk_live_not_a_real_key",
      "idempotency-key": "identity-user-123",
    });
    const body = request.body as URLSearchParams;
    expect(body.get("type")).toBe("document");
    expect(body.get("return_url")).toBe(
      "https://nationreserve.com/account/verification",
    );
    expect(body.get("metadata[user_id]")).toBe("00000000-0000-4000-8000-000000000123");
    expect([...body.keys()]).not.toContain("document");
    expect([...body.keys()]).not.toContain("ssn");
  });
});
