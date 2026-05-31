// src/contracts/auth.ts
import { z } from 'zod';

import { uuidSchema } from './supabase';

export const authMethods = ['email_otp', 'apple', 'google'] as const;
export const authMethodSchema = z.enum(authMethods);
export type AuthMethod = z.infer<typeof authMethodSchema>;

// Apple/Google are reserved in the union so the session layer and sign-in UI
// accept them without a rewrite. Only email_otp is wired in PUP-18.
export const enabledAuthMethods = ['email_otp'] as const satisfies readonly AuthMethod[];

export const emailSchema = z.string().trim().toLowerCase().pipe(z.string().email());
export type Email = z.infer<typeof emailSchema>;

export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/);
export type OtpCode = z.infer<typeof otpCodeSchema>;

export const sessionUserSchema = z
  .object({
    id: uuidSchema,
    email: z.string().email().nullable(),
  })
  .strict();
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authStatuses = ['loading', 'signedOut', 'signedIn'] as const;
export type AuthStatus = (typeof authStatuses)[number];

// SECURITY DEFINER bootstrap_current_user(text) returns one row.
export const bootstrapResultSchema = z
  .object({
    household_id: uuidSchema,
    created: z.boolean(),
  })
  .strict();
export type BootstrapResult = z.infer<typeof bootstrapResultSchema>;
