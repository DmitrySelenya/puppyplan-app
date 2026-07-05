import {
  createOnboardingPromptCadence,
  ONBOARDING_PROMPT_REPROMPT_MS,
  resolveOnboardingPromptStage,
  type OnboardingPromptCadenceStorage,
} from '@/lib/storage/onboardingPromptCadence';

describe('Onboarding post-first-value prompt cadence', () => {
  const nowMs = Date.parse('2026-07-03T12:00:00.000Z');

  it('AC-OB-PROMPT-CADENCE-1 resolves to the first prompt outside the 48-hour cooldown', () => {
    expect(resolveOnboardingPromptStage('account', {
      accountSkippedAt: nowMs - ONBOARDING_PROMPT_REPROMPT_MS + 1,
      notificationsSkippedAt: null,
    }, nowMs)).toBe('notifications');

    expect(resolveOnboardingPromptStage('account', {
      accountSkippedAt: nowMs - ONBOARDING_PROMPT_REPROMPT_MS + 1,
      notificationsSkippedAt: nowMs - ONBOARDING_PROMPT_REPROMPT_MS + 1,
    }, nowMs)).toBe('complete');

    expect(resolveOnboardingPromptStage('account', {
      accountSkippedAt: nowMs - ONBOARDING_PROMPT_REPROMPT_MS - 1,
      notificationsSkippedAt: nowMs - ONBOARDING_PROMPT_REPROMPT_MS + 1,
    }, nowMs)).toBe('account');
  });

  it('AC-OB-PROMPT-CADENCE-2 persists skip timestamps per prompt kind', async () => {
    const values = new Map<string, string>();
    const storage: OnboardingPromptCadenceStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        values.set(key, value);
      },
    };
    const cadence = createOnboardingPromptCadence({
      now: () => nowMs,
      storage,
    });

    await cadence.recordSkip('account');

    await expect(cadence.resolveInitialPrompt('account')).resolves.toBe('notifications');
    await expect(cadence.resolveInitialPrompt('notifications')).resolves.toBe('notifications');

    await cadence.recordSkip('notifications');

    await expect(cadence.resolveInitialPrompt('account')).resolves.toBe('complete');
  });

  it('AC-OB-PROMPT-CADENCE-4 reports storage failures without blocking prompt flow', async () => {
    const storageFailure = new Error('storage unavailable');
    const captureException = jest.fn();
    const storage: OnboardingPromptCadenceStorage = {
      getItem: async () => {
        throw storageFailure;
      },
      setItem: async () => {
        throw storageFailure;
      },
    };
    const cadence = createOnboardingPromptCadence({
      now: () => nowMs,
      observability: { captureException },
      storage,
    });

    await expect(cadence.resolveInitialPrompt('account')).resolves.toBe('account');
    await expect(cadence.recordSkip('account')).resolves.toBeUndefined();
    expect(captureException).toHaveBeenCalledWith(storageFailure, expect.objectContaining({
      area: 'onboarding',
      operation: 'prompt_cadence_read',
    }));
    expect(captureException).toHaveBeenCalledWith(storageFailure, expect.objectContaining({
      area: 'onboarding',
      operation: 'prompt_cadence_write',
    }));
  });
});
