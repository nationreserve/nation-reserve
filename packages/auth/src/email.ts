/* eslint-disable @typescript-eslint/require-await */
export interface AuthEmail {
  to: string; token: string; expiresAt: Date; organizationName?: string;
}
export interface AuthEmailAdapter {
  sendEmailVerification(message: AuthEmail): Promise<void>;
  sendPasswordReset(message: AuthEmail): Promise<void>;
  sendOrganizationInvitation(message: AuthEmail): Promise<void>;
  sendSecurityNotice(message: Omit<AuthEmail, "token"> & { summary: string }): Promise<void>;
}
export class TestEmailAdapter implements AuthEmailAdapter {
  readonly messages: Array<{ kind: string; message: object }> = [];
  async sendEmailVerification(message: AuthEmail) { this.messages.push({ kind: "verification", message }); }
  async sendPasswordReset(message: AuthEmail) { this.messages.push({ kind: "reset", message }); }
  async sendOrganizationInvitation(message: AuthEmail) { this.messages.push({ kind: "invitation", message }); }
  async sendSecurityNotice(message: Omit<AuthEmail, "token"> & { summary: string }) {
    this.messages.push({ kind: "security", message });
  }
}
export class DevelopmentEmailAdapter extends TestEmailAdapter {
  constructor(nodeEnv: string, private readonly write: (line: string) => void = console.info) {
    super();
    if (nodeEnv === "production") throw new Error("Development email adapter is forbidden in production.");
  }
  override async sendEmailVerification(message: AuthEmail) {
    await super.sendEmailVerification(message); this.write(JSON.stringify({ kind: "verification", ...message }));
  }
  override async sendPasswordReset(message: AuthEmail) {
    await super.sendPasswordReset(message); this.write(JSON.stringify({ kind: "password-reset", ...message }));
  }
}

