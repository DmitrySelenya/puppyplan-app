import {
  createQuickLogAnalyticsEvent,
  type QuickLogAnalyticsEvent,
} from '@/contracts/analytics';

export type AnalyticsAdapter = Readonly<{
  track(name: QuickLogAnalyticsEvent['name'], properties: QuickLogAnalyticsEvent['properties']): void;
}>;

export type QuickLogAnalyticsClient = Readonly<{
  trackQuickLogEvent(event: QuickLogAnalyticsEvent): void;
}>;

const noopAnalyticsAdapter: AnalyticsAdapter = {
  track: () => undefined,
};

export function createAnalyticsClient(
  adapter: AnalyticsAdapter = noopAnalyticsAdapter,
): QuickLogAnalyticsClient {
  return {
    trackQuickLogEvent: (input) => {
      const event = createQuickLogAnalyticsEvent(input);

      adapter.track(event.name, event.properties);
    },
  };
}

export const noopAnalyticsClient = createAnalyticsClient();
