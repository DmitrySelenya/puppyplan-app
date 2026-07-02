import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';

import PetRoute from '../../app/(tabs)/pet';

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: (href: string) => mockRouterPush(href),
  }),
}));

describe('PetRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterPush.mockClear();
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('routes the Pet hub Quick Trackers entry to tracker settings', () => {
    render(<PetRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.pet-hub.quick-trackers-a11y'),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith('/settings/quick-trackers');
  });

  it('routes the Pet hub Edit profile action to puppy profile settings', () => {
    render(<PetRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.pet-hub.edit-profile'),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith('/settings/puppy-profile');
  });

  it('routes the empty Pet Health Add record action to the health record editor', () => {
    render(<PetRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.empty.primary'),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith('/pet/health-record-edit');
  });
});
