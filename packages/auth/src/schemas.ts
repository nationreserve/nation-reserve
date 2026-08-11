import { z } from "zod";
import { normalizeEmail } from "./crypto.js";

const email = z.string().email().transform(normalizeEmail);
const password = z.string().min(12).max(256);
const registrationBase = z.object({
  email, password, passwordConfirmation: z.string(),
  displayName: z.string().trim().min(1).max(200),
  organizationLegalName: z.string().trim().min(1).max(250),
  organizationDisplayName: z.string().trim().min(1).max(250),
  acceptTerms: z.literal(true),
}).refine((value) => value.password === value.passwordConfirmation, {
  message: "Passwords do not match.", path: ["passwordConfirmation"],
});
export const robotOwnerRegistrationSchema = registrationBase;
export const hiringCompanyRegistrationSchema = registrationBase;
export const manufacturerRegistrationSchema = registrationBase;
export const loginSchema = z.object({ email, password: z.string().min(1).max(256) });
export const tokenConfirmationSchema = z.object({ token: z.string().min(32).max(512) });
export const passwordResetConfirmationSchema = tokenConfirmationSchema.extend({
  password, passwordConfirmation: z.string(),
}).refine((value) => value.password === value.passwordConfirmation, {
  message: "Passwords do not match.", path: ["passwordConfirmation"],
});
export const invitationSchema = z.object({ email, role: z.string().min(1).max(50) });
export type RegistrationInput = z.infer<typeof registrationBase>;

