import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { PuppyProfile } from '@/contracts/supabase';
import { PuppyProfileSettingsScreen } from '@/features/profile/screens/PuppyProfileSettingsScreen';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

const puppy: PuppyProfile = {
  age_weeks_estimate: 8,
  birth_date: null,
  created_at: '2026-06-09T08:00:00.000Z',
  deleted_at: null,
  household_id: '00000000-0000-4000-8000-000000004001',
  id: '00000000-0000-4000-8000-000000004002',
  name: 'Puppy',
  quick_tracker_ids: ['potty_pee_outside', 'feeding_meal'],
  updated_at: '2026-06-09T08:00:00.000Z',
};

describe('Puppy profile settings screen', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('shows retry copy when profile save fails', async () => {
    const saveProfile = jest.fn(async () => {
      throw new Error('offline');
    });

    render(
      <AppProviders>
        <PuppyProfileSettingsScreen
          puppy={puppy}
          saveProfile={saveProfile}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.puppy-profile.save'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('errors.save-failed-connection'))).toBeTruthy();
    });
  });
});
