import { AccessibilityInfo } from 'react-native';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
    cleanup();
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
    expect(
      screen.getByLabelText(i18n.t('errors.save-failed-connection')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
  });

  it('shows owner-only copy when profile save is permission denied', async () => {
    const saveProfile = jest.fn(async () => {
      throw new Error('puppy_profile_owner_required');
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
      expect(screen.getByText(i18n.t('errors.owner-only-settings'))).toBeTruthy();
    });
    expect(
      screen.getByLabelText(i18n.t('errors.owner-only-settings')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
    expect(screen.queryByText(i18n.t('errors.save-failed-connection'))).toBeNull();
  });

  it('does not render the editable profile form for non-owners', () => {
    render(
      <AppProviders>
        <PuppyProfileSettingsScreen
          canManagePuppySettings={false}
          puppy={puppy}
          saveProfile={jest.fn()}
        />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('errors.owner-only-settings'))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t('errors.owner-only-settings')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
    expect(screen.queryByRole('button', {
      name: i18n.t('more.puppy-profile.save'),
    })).toBeNull();
  });

  it('rejects non-numeric age text before saving profile settings', () => {
    const saveProfile = jest.fn();

    render(
      <AppProviders>
        <PuppyProfileSettingsScreen
          puppy={puppy}
          saveProfile={saveProfile}
        />
      </AppProviders>,
    );

    const ageField = screen
      .getAllByLabelText(i18n.t('onboarding.puppy-profile.age-toggle-age'))
      .find((element) => element.props.value === '8');

    expect(ageField).toBeTruthy();

    fireEvent.changeText(ageField!, '8abc');
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.puppy-profile.save'),
    }));

    expect(screen.getByText(i18n.t('onboarding.puppy-profile.error-required'))).toBeTruthy();
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
