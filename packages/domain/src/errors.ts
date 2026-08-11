import type { DomainErrorCode } from "@nation-reserve/contracts";

export class DomainError extends Error {
  public constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function invariant(
  condition: unknown,
  code: DomainErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): asserts condition {
  if (!condition) {
    throw new DomainError(code, message, details);
  }
}
