import { z } from "zod";

export const heartbeatMessageSchema = z.object({
  schemaVersion: z.literal(1),
  messageId: z.string().uuid(),
  robotId: z.string().uuid(),
  manufacturerSerialNumber: z.string().min(1).max(200),
  sentAt: z.coerce.date(),
  sequenceNumber: z.number().int().nonnegative(),
  nonce: z.string().min(16).max(256),
  manufacturerState: z.string().min(1).max(100),
  assignmentId: z.string().uuid(),
  firmwareVersion: z.string().min(1).max(100),
  apiVersion: z.literal("v1"),
  networkStatus: z.enum(["connected", "disconnected", "degraded"]),
  batteryPercent: z.number().min(0).max(100).optional(),
  diagnostics: z.record(z.string(), z.unknown()).optional(),
}).strict();
export type HeartbeatMessage = z.infer<typeof heartbeatMessageSchema>;

export const credentialProvisionSchema = z.object({
  credentialType: z.enum(["hmac_secret", "public_key_signature", "device_certificate"]),
  publicKey: z.string().min(32).optional(),
  certificateFingerprint: z.string().min(16).optional(),
}).superRefine((value, context) => {
  if (value.credentialType === "public_key_signature" && !value.publicKey)
    context.addIssue({ code: "custom", message: "publicKey is required" });
  if (value.credentialType === "device_certificate" && !value.certificateFingerprint)
    context.addIssue({ code: "custom", message: "certificateFingerprint is required" });
});

export const inactiveReportSchema = z.object({
  robotId: z.string().uuid(),
  observedAt: z.coerce.date(),
  reason: z.enum(["robot_not_present", "robot_powered_off", "robot_not_moving",
    "robot_not_performing_assigned_work", "wrong_robot", "network_connected_but_inactive",
    "fault_visible", "emergency_stop", "other"]),
  notes: z.string().max(2000).optional(),
  incidentCategory: z.string().max(100).optional(),
});
