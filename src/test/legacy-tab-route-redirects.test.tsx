import { render } from '@testing-library/react-native';

import { AppProviders } from '@/lib/providers/AppProviders';

import HealthLegacyRoute from '../../app/(tabs)/health';
import TodayLegacyRoute from '../../app/(tabs)/today';

const mockRedirectHrefs: string[] = [];

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirectHrefs.push(href);
    return null;
  },
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@/features/health/screens/HealthScreen', () => ({
  HealthScreen: () => null,
}));

jest.mock('@/features/today/screens/TodayScreen', () => ({
  TodayScreen: () => null,
  createTodayPlanInputFromPuppy: jest.fn(),
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({
    careContext: null,
    puppy: null,
    status: 'empty',
  }),
}));

jest.mock('@/lib/query/quick-log', () => ({
  useQuickLogMutationPort: () => ({
    mutation: undefined,
    mutationEvents: [],
    status: 'unavailable',
  }),
}));

describe('legacy tab route redirects', () => {
  beforeEach(() => {
    mockRedirectHrefs.length = 0;
  });

  it('keeps /today as a legacy alias to /diary', () => {
    render(
      <AppProviders>
        <TodayLegacyRoute />
      </AppProviders>,
    );

    expect(mockRedirectHrefs).toEqual(['/diary']);
  });

  it('keeps /health as a legacy alias to /pet', () => {
    render(
      <AppProviders>
        <HealthLegacyRoute />
      </AppProviders>,
    );

    expect(mockRedirectHrefs).toEqual(['/pet']);
  });
});
