import { render, waitFor } from '@testing-library/react-native';

import { AppProviders } from '@/lib/providers/AppProviders';

import TimelineRoute from '../../app/(modals)/timeline';

const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (href: string) => mockRouterReplace(href),
  },
}));

describe('TimelineRoute redirect contract', () => {
  beforeEach(() => {
    mockRouterReplace.mockClear();
  });

  it('AC-DIARY-NAV-1 redirects the removed standalone Timeline route to Diary', async () => {
    render(
      <AppProviders>
        <TimelineRoute />
      </AppProviders>,
    );

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/diary'));
  });
});
