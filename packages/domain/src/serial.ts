import { DomainError } from "./errors.js";

export function normalizeRobotSerial(serial: string): string {
  const normalized = serial.trim().toUpperCase().replace(/[\s-]+/g, "");
  if (!normalized || !/^[A-Z0-9]+$/.test(normalized)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Robot serial must contain letters or digits after normalization.",
      { field: "manufacturerSerialNumber" },
    );
  }
  return normalized;
}
