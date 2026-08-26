export interface AuthEmail {
  to: string;
  token: string;
  expiresAt: Date;
  organizationName?: string;
}

export interface AuthEmailAdapter {
  sendEmailVerification(message: AuthEmail): Promise<void>;
  sendPasswordReset(message: AuthEmail): Promise<void>;
  sendOrganizationInvitation(message: AuthEmail): Promise<void>;
  sendSecurityNotice(
    message: Omit<AuthEmail, "token"> & { summary: string },
  ): Promise<void>;
}

export class TestEmailAdapter implements AuthEmailAdapter {
  readonly messages: Array<{ kind: string; message: object }> = [];
  sendEmailVerification(message: AuthEmail): Promise<void> {
    this.messages.push({ kind: "verification", message });
    return Promise.resolve();
  }
  sendPasswordReset(message: AuthEmail): Promise<void> {
    this.messages.push({ kind: "reset", message });
    return Promise.resolve();
  }
  sendOrganizationInvitation(message: AuthEmail): Promise<void> {
    this.messages.push({ kind: "invitation", message });
    return Promise.resolve();
  }
  sendSecurityNotice(
    message: Omit<AuthEmail, "token"> & { summary: string },
  ): Promise<void> {
    this.messages.push({ kind: "security", message });
    return Promise.resolve();
  }
}

export class DevelopmentEmailAdapter extends TestEmailAdapter {
  constructor(
    nodeEnv: string,
    private readonly write: (line: string) => void = console.info,
  ) {
    super();
    if (nodeEnv === "production")
      throw new Error("Development email adapter is forbidden in production.");
  }
  override async sendEmailVerification(message: AuthEmail): Promise<void> {
    await super.sendEmailVerification(message);
    this.write(JSON.stringify({ kind: "verification", ...message }));
  }
  override async sendPasswordReset(message: AuthEmail): Promise<void> {
    await super.sendPasswordReset(message);
    this.write(JSON.stringify({ kind: "password-reset", ...message }));
  }
}

interface EmailContent {
  subject: string;
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}
export interface ResendEmailAdapterOptions {
  apiKey: string;
  from: string;
  applicationUrl: string;
  fetchImplementation?: typeof fetch;
}

export class ResendEmailAdapter implements AuthEmailAdapter {
  readonly #fetch: typeof fetch;
  readonly #applicationUrl: string;
  constructor(private readonly options: ResendEmailAdapterOptions) {
    if (!options.apiKey.startsWith("re_") || options.apiKey.length < 20)
      throw new Error("A valid RESEND_API_KEY is required in production.");
    if (!options.from.includes("@"))
      throw new Error("A valid RESEND_FROM_EMAIL is required in production.");
    this.#applicationUrl = new URL(options.applicationUrl).origin;
    this.#fetch = options.fetchImplementation ?? fetch;
  }
  sendEmailVerification(message: AuthEmail): Promise<void> {
    return this.send(message.to, {
      subject: "Verify your RoboWorkPool account",
      text: `Verify your account before ${message.expiresAt.toISOString()}.`,
      actionUrl: this.actionUrl("/verify-email", message.token),
      actionLabel: "Verify account",
    });
  }
  sendPasswordReset(message: AuthEmail): Promise<void> {
    return this.send(message.to, {
      subject: "Reset your RoboWorkPool password",
      text: `Reset your password before ${message.expiresAt.toISOString()}. If you did not request this, you can ignore this message.`,
      actionUrl: this.actionUrl("/reset-password", message.token),
      actionLabel: "Reset password",
    });
  }
  sendOrganizationInvitation(message: AuthEmail): Promise<void> {
    const organization = message.organizationName ?? "a RoboWorkPool organization";
    return this.send(message.to, {
      subject: `Invitation to ${organization}`,
      text: `You were invited to ${organization}. Review the invitation before ${message.expiresAt.toISOString()}.`,
      actionUrl: this.actionUrl("/accept-invitation", message.token),
      actionLabel: "Review invitation",
    });
  }
  sendSecurityNotice(
    message: Omit<AuthEmail, "token"> & { summary: string },
  ): Promise<void> {
    return this.send(message.to, {
      subject: "RoboWorkPool security notice",
      text: message.summary,
    });
  }
  private actionUrl(path: string, token: string): string {
    const url = new URL(path, this.#applicationUrl);
    url.searchParams.set("token", token);
    return url.toString();
  }
  private async send(to: string, content: EmailContent): Promise<void> {
    const response = await this.#fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.options.from,
        to: [to],
        subject: content.subject,
        text: content.text,
        html: renderHtml(content),
      }),
    });
    if (!response.ok)
      throw new Error(`Resend email delivery failed with status ${response.status}.`);
  }
}

export function createAuthEmailAdapter(
  environment: Record<string, string | undefined>,
  fetchImplementation?: typeof fetch,
): AuthEmailAdapter {
  const nodeEnv = environment["NODE_ENV"] ?? "development";
  if (nodeEnv !== "production") return new DevelopmentEmailAdapter(nodeEnv);
  const apiKey = environment["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY is required in production.");
  const applicationUrl = environment["WEB_ORIGIN"];
  if (!applicationUrl)
    throw new Error("WEB_ORIGIN is required for production email links.");
  return new ResendEmailAdapter({
    apiKey,
    from: environment["RESEND_FROM_EMAIL"] ?? "no-reply@mail.nationreserve.com",
    applicationUrl,
    ...(fetchImplementation ? { fetchImplementation } : {}),
  });
}

function renderHtml(content: EmailContent): string {
  const action =
    content.actionUrl && content.actionLabel
      ? `<p><a href="${escapeHtml(content.actionUrl)}">${escapeHtml(content.actionLabel)}</a></p>`
      : "";
  return `<main><h1>${escapeHtml(content.subject)}</h1><p>${escapeHtml(content.text)}</p>${action}<p>Nation Reserve &mdash; RoboWorkPool</p></main>`;
}
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
