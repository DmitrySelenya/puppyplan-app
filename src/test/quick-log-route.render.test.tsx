import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import QuickLogRoute from '../../app/(modals)/quick-log';

const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({
    careContext: null,
    puppy: null,
    status: 'empty',
  }),
}));

describe('QuickLogRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('closes the unavailable Quick Log route through router.back', () => {
    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.unavailable.close'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
