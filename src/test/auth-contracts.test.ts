// src/test/auth-contracts.test.ts
import {
  authMethodSchema,
  bootstrapResultSchema,
  emailSchema,
  enabledAuthMethods,
  otpCodeSchema,
  sessionUserSchema,
} from '@/contracts/auth';

describe('auth contracts', () => {
  it('reserves apple and google in the method union but enables only email_otp now', () => {
    expect(authMethodSchema.options).toEqual(['email_otp', 'apple', 'google']);
    expect(enabledAuthMethods).toEqual(['email_otp']);
  });

  it('normalizes emails to trimmed lowercase and rejects invalid input', () => {
    expect(emailSchema.parse('  Owner@Example.COM ')).toBe('owner@example.com');
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('accepts only six-digit OTP codes', () => {
    expect(otpCodeSchema.parse('123456')).toBe('123456');
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
    expect(otpCodeSchema.safeParse('abcdef').success).toBe(false);
  });

  it('parses a session user with a nullable email', () => {
    const id = '00000000-0000-4000-8000-000000000101';
    expect(sessionUserSchema.parse({ id, email: 'owner@example.com' })).toEqual({
      id,
      email: 'owner@example.com',
    });
    expect(sessionUserSchema.parse({ id, email: null })).toEqual({ id, email: null });
  });

  it('parses the bootstrap RPC result row', () => {
    const householdId = '00000000-0000-4000-8000-000000000201';
    expect(bootstrapResultSchema.parse({ household_id: householdId, created: true })).toEqual({
      household_id: householdId,
      created: true,
    });
  });
});
