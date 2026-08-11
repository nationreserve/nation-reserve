import { z } from "zod";
export const environmentSchema = z.enum(["sandbox", "production"]);
export const applicationSchema = z.object({
  legalBusinessName: z.string().trim().min(1), websiteUrl: z.string().url().optional(),
  supportEmail: z.string().email(), technicalContactName: z.string().min(1),
  technicalContactEmail: z.string().email(), operationsContactName: z.string().min(1),
  operationsContactEmail: z.string().email(), primaryCountryCode: z.string().length(2).toUpperCase(),
  businessDescription: z.string().min(20), robotCategories: z.array(z.string()).min(1),
  anticipatedRobotVolume: z.number().int().nonnegative(), integrationReadiness: z.record(z.string(), z.unknown()),
  complianceAttestation: z.record(z.string(), z.unknown()),
});
export const registrationSchema = z.object({
  modelId: z.string().uuid(), modelRevisionId: z.string().uuid(), environment: environmentSchema,
  manufacturerSerialNumber: z.string().trim().min(1).max(200),
  hardwareRevision: z.string().max(100).optional(), firmwareVersion: z.string().max(100).optional(),
  hardwareIdentityType: z.enum(["device_key","certificate_fingerprint","secure_element",
    "manufacturer_device_id","hardware_public_key"]).optional(),
  hardwareIdentityValue: z.string().min(16).optional(), regionCode: z.string().max(20).optional(),
  apiVersion: z.string().min(1), idempotencyKey: z.string().min(8).max(200),
});
export const ownershipClaimSchema = z.object({
  serialNumber: z.string().min(1), transferCode: z.string().min(20),
  ownerOrganizationId: z.string().uuid(),
});
export const activationMessageSchema = z.object({
  requestId: z.string().uuid(), nonce: z.string().min(16), timestamp: z.coerce.date(),
  manufacturerState: z.string().min(1),
});

