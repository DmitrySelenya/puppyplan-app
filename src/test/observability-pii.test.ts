import {
  createObservabilityReporter,
  scrubObservabilityPayload,
} from '@/lib/observability';

describe('observability PII scrubber', () => {
  it('removes private values, private keys, and raw backend errors from payloads', () => {
    const scrubbed = scrubObservabilityPayload({
      breadcrumbs: [{
        category: 'quick_log',
        data: {
          backend_error: 'backend detail PuppyDisplayPrivate private routine text',
          event_type: 'feeding',
        },
        message: 'attempt contained person@example.com and PuppyDisplayPrivate',
      }],
      contexts: {
        quickLog: {
          media_url: 'https://example.com/private-photo',
          note_text: 'private routine text',
          provider_name: 'ProviderNamePrivate',
          safe_category: 'permission_denied',
        },
      },
      extra: {
        raw_backend_error: 'database detail leaked PuppyDisplayPrivate',
        raw_email: 'person@example.com',
      },
      message: 'Quick Log backend error included PuppyDisplayPrivate',
      tags: {
        event_type: 'feeding',
        puppy_name: 'PuppyDisplayPrivate',
      },
    });
    const serialized = JSON.stringify(scrubbed);

    expect(scrubbed).toMatchObject({
      contexts: {
        quickLog: {
          safe_category: 'permission_denied',
        },
      },
      message: 'Quick Log operation failed',
      tags: {
        event_type: 'feeding',
      },
    });
    expect(serialized).not.toContain('PuppyDisplayPrivate');
    expect(serialized).not.toContain('private routine text');
    expect(serialized).not.toContain('person@example.com');
    expect(serialized).not.toContain('ProviderNamePrivate');
    expect(serialized).not.toContain('backend_error');
    expect(serialized).not.toContain('note_text');
    expect(serialized).not.toContain('puppy_name');
  });

  it('reports only scrubbed observability events to the adapter', () => {
    const captureException = jest.fn();
    const reporter = createObservabilityReporter({ captureException });

    reporter.captureException(new Error('backend PuppyDisplayPrivate raw detail'), {
      area: 'quick_log',
      errorCategory: 'unknown',
      extra: {
        backend_error: 'backend PuppyDisplayPrivate raw detail',
      },
      operation: 'save_event',
      tags: {
        event_type: 'feeding',
      },
    });

    expect(captureException).toHaveBeenCalledWith(expect.objectContaining({
      area: 'quick_log',
      errorCategory: 'unknown',
      message: 'Quick Log operation failed',
      operation: 'save_event',
      tags: {
        event_type: 'feeding',
      },
    }));
    expect(JSON.stringify(captureException.mock.calls[0])).not.toContain('PuppyDisplayPrivate');
  });

  it('removes household/member display names, token-like values, and raw health text', () => {
    const accessToken = `tok_live_${'a'.repeat(32)}`;
    const jwt = `eyJ${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`;
    const rawHealthText = 'persistent cough after meal';
    const scrubbed = scrubObservabilityPayload({
      breadcrumbs: [{
        data: {
          household_member_name: 'HouseholdDisplayNameSynthetic',
          safe_category: 'request_timeout',
        },
        message: `retry used ${jwt}`,
      }],
      contexts: {
        quickLog: {
          actor_display_name: 'CaregiverDisplaySynthetic',
          detail: rawHealthText,
          safe_category: 'server_5xx',
          token_hint: accessToken,
        },
      },
      extra: {
        health_summary: rawHealthText,
        safe_value: accessToken,
      },
      tags: {
        event_type: 'feeding',
        member_display_name: 'HouseholdDisplayNameSynthetic',
      },
    });
    const serialized = JSON.stringify(scrubbed);

    expect(scrubbed).toMatchObject({
      contexts: {
        quickLog: {
          detail: '[redacted]',
          safe_category: 'server_5xx',
        },
      },
      message: 'Quick Log operation failed',
      tags: {
        event_type: 'feeding',
      },
    });
    expect(serialized).not.toContain('HouseholdDisplayNameSynthetic');
    expect(serialized).not.toContain('CaregiverDisplaySynthetic');
    expect(serialized).not.toContain(accessToken);
    expect(serialized).not.toContain(jwt);
    expect(serialized).not.toContain(rawHealthText);
    expect(serialized).not.toContain('member_display_name');
    expect(serialized).not.toContain('health_summary');
  });

  it('drops canonical identity keys even when values are non-UUID identifiers', () => {
    const scrubbed = scrubObservabilityPayload({
      contexts: {
        quickLog: {
          clientEventId: 'client-event-from-legacy-store',
          householdId: 'legacy-household-42',
          safe_category: 'server_5xx',
        },
      },
      extra: {
        actor_id: 'legacy-actor-42',
        created_by: 'external-created-by',
        puppy_id: 'legacy-puppy-42',
      },
      tags: {
        event_type: 'feeding',
        user_id: 'legacy-user-42',
      },
    });
    const serialized = JSON.stringify(scrubbed);

    expect(scrubbed).toMatchObject({
      contexts: {
        quickLog: {
          safe_category: 'server_5xx',
        },
      },
      message: 'Quick Log operation failed',
      tags: {
        event_type: 'feeding',
      },
    });
    expect(serialized).not.toContain('client-event-from-legacy-store');
    expect(serialized).not.toContain('legacy-household-42');
    expect(serialized).not.toContain('legacy-actor-42');
    expect(serialized).not.toContain('external-created-by');
    expect(serialized).not.toContain('legacy-puppy-42');
    expect(serialized).not.toContain('legacy-user-42');
    expect(serialized).not.toContain('clientEventId');
    expect(serialized).not.toContain('householdId');
    expect(serialized).not.toContain('actor_id');
    expect(serialized).not.toContain('created_by');
    expect(serialized).not.toContain('puppy_id');
    expect(serialized).not.toContain('user_id');
  });
});
