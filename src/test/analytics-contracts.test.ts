import {
  createQuickLogAnalyticsEvent,
  quickLogAnalyticsEventNames,
} from '@/contracts/analytics';
import { createAnalyticsClient } from '@/lib/analytics';

describe('Quick Log analytics contracts', () => {
  it('accepts only the PUP-16 Quick Log event taxonomy with stable properties', () => {
    const events = [
      {
        name: 'event_logged',
        properties: {
          connection_state: 'online',
          event_type: 'feeding',
          save_result: 'server_confirmed',
          source_surface: 'quick_log_sheet',
        },
      },
      {
        name: 'event_save_failed',
        properties: {
          connection_state: 'unknown',
          error_category: 'permission_denied',
          event_type: 'feeding',
        },
      },
      {
        name: 'pending_quick_log_created',
        properties: {
          connection_state: 'unknown',
          event_type: 'feeding',
        },
      },
      {
        name: 'pending_quick_log_deleted',
        properties: {
          event_type: 'feeding',
          pending_age_bucket: 'unknown',
        },
      },
      {
        name: 'duplicate_warning_seen',
        properties: {
          event_type: 'feeding',
          time_since_previous_bucket: 'under_60s',
        },
      },
      {
        name: 'duplicate_warning_confirmed',
        properties: {
          event_type: 'feeding',
        },
      },
      {
        name: 'undo_used',
        properties: {
          event_type: 'feeding',
          seconds_after_log_bucket: 'unknown',
        },
      },
      {
        name: 'offline_or_failed_log_recovered',
        properties: {
          event_type: 'feeding',
          recovery_surface: 'manual_retry',
          retry_count_bucket: 'two',
        },
      },
    ] as const;

    expect(quickLogAnalyticsEventNames).toEqual(events.map((event) => event.name));
    expect(events.map((event) => createQuickLogAnalyticsEvent(event))).toEqual(events);
  });

  it('rejects unknown events, unknown properties, and raw retry counts', () => {
    expect(() => createQuickLogAnalyticsEvent({
      name: 'quick_log_abandoned',
      properties: {
        event_type: 'feeding',
        surface: 'quick_log_sheet',
      },
    })).toThrow();
    expect(() => createQuickLogAnalyticsEvent({
      name: 'event_logged',
      properties: {
        connection_state: 'online',
        event_type: 'feeding',
        save_result: 'server_confirmed',
        source_surface: 'quick_log_sheet',
        tracker_id: 'feeding_meal',
      },
    })).toThrow();
    expect(() => createQuickLogAnalyticsEvent({
      name: 'offline_or_failed_log_recovered',
      properties: {
        event_type: 'feeding',
        recovery_surface: 'manual_retry',
        retry_count: 2,
      },
    })).toThrow();
    expect(() => createQuickLogAnalyticsEvent({
      name: 'event_logged',
      properties: {
        connection_state: 'online',
        event_type: 'health_record_reference',
        save_result: 'server_confirmed',
        source_surface: 'quick_log_sheet',
      },
    })).toThrow();
  });

  it('rejects private fields and raw backend error data', () => {
    const privateInputs = [
      {
        name: 'event_logged',
        properties: {
          connection_state: 'online',
          event_type: 'feeding',
          puppy_name: 'PuppyDisplayPrivate',
          save_result: 'server_confirmed',
          source_surface: 'quick_log_sheet',
        },
      },
      {
        name: 'event_save_failed',
        properties: {
          backend_error: 'backend detail contained private routine text',
          connection_state: 'unknown',
          error_category: 'unknown',
          event_type: 'feeding',
        },
      },
      {
        name: 'pending_quick_log_deleted',
        properties: {
          event_type: 'feeding',
          household_id: '00000000-0000-4000-8000-000000000501',
          pending_age_bucket: 'unknown',
        },
      },
    ] as const;

    for (const input of privateInputs) {
      expect(() => createQuickLogAnalyticsEvent(input)).toThrow();
    }
  });

  it('forwards only parsed Quick Log analytics events through the wrapper', () => {
    const track = jest.fn();
    const analytics = createAnalyticsClient({ track });

    analytics.trackQuickLogEvent({
      name: 'pending_quick_log_created',
      properties: {
        connection_state: 'unknown',
        event_type: 'feeding',
      },
    });

    expect(track).toHaveBeenCalledWith('pending_quick_log_created', {
      connection_state: 'unknown',
      event_type: 'feeding',
    });
    expect(() => analytics.trackQuickLogEvent({
      name: 'event_save_failed',
      properties: {
        connection_state: 'unknown',
        error_category: 'unknown',
        event_type: 'feeding',
        note_text: 'private routine text',
      },
    } as never)).toThrow();
  });
});
