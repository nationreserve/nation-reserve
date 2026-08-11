import { z } from "zod";

export const heartbeatConfigSchema = z.object({
  ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY: z.string().min(43),
  HEARTBEAT_EXPECTED_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
  HEARTBEAT_GRACE_PERIOD_SECONDS: z.coerce.number().int().nonnegative().default(15),
  HEARTBEAT_OFFLINE_THRESHOLD_SECONDS: z.coerce.number().int().positive().default(90),
  HEARTBEAT_MAX_CLOCK_SKEW_SECONDS: z.coerce.number().int().positive().default(120),
  HEARTBEAT_MAX_FUTURE_SECONDS: z.coerce.number().int().nonnegative().default(30),
  HEARTBEAT_MAX_DELAYED_ELIGIBILITY_SECONDS: z.coerce.number().int().positive().default(120),
  HEARTBEAT_SEQUENCE_REORDER_WINDOW: z.coerce.number().int().nonnegative().default(5),
  HEARTBEAT_NONCE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  HEARTBEAT_MAX_BODY_BYTES: z.coerce.number().int().min(1024).default(32768),
  HEARTBEAT_RATE_LIMIT_PER_ROBOT: z.coerce.number().int().positive().default(180),
  HEARTBEAT_RATE_LIMIT_PER_MANUFACTURER: z.coerce.number().int().positive().default(10000),
  HEARTBEAT_CALCULATION_VERSION: z.coerce.number().int().positive().default(1),
  HEARTBEAT_MESSAGE_RETENTION_DAYS: z.coerce.number().int().positive().default(730),
  HEARTBEAT_SECURITY_EVIDENCE_RETENTION_DAYS: z.coerce.number().int().positive().default(2555),
  HEARTBEAT_PAYROLL_EVIDENCE_RETENTION_DAYS: z.coerce.number().int().positive().default(2555),
  HEARTBEAT_RAW_SIGNATURE_RETENTION_HOURS: z.coerce.number().int().nonnegative().default(24),
  DOWNTIME_RETENTION_DAYS: z.coerce.number().int().positive().default(2555),
  OPERATIONAL_INCIDENT_RETENTION_DAYS: z.coerce.number().int().positive().default(2555),
  FRAUD_SIGNAL_RETENTION_DAYS: z.coerce.number().int().positive().default(2555),
  OFFLINE_DETECTION_WORKER_INTERVAL_SECONDS: z.coerce.number().int().positive().default(15),
});

export type HeartbeatConfig = z.infer<typeof heartbeatConfigSchema>;
