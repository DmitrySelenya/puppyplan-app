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
  quick_tracker_ids: ['potty', 'feeding'],
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

  it('starts in the saved atlas view with header, avatar hero, grouped fields, and Add affordances', () => {
    render(
      <AppProviders>
        <PuppyProfileSettingsScreen
          onBack={jest.fn()}
          puppy={puppy}
          saveProfile={jest.fn()}
        />
      </AppProviders>,
    );

    expect(screen.getByRole('header', { name: i18n.t('more.puppy-profile.screen-title') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.screen-title') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('more.puppy-profile.change-photo'),
    }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText(i18n.t('more.puppy-profile.sections.about'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.field-name'))).toBeTruthy();
    expect(screen.getByText('Puppy')).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.field-birth-default'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.dob-subtitle-weeks', { count: 8 }))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.puppy-profile.field-breed'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.field-gender'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.sections.optional'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.field-weight'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.field-microchip'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.field-note'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.note-subtitle'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('more.puppy-profile.add-value')).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(i18n.t('more.puppy-profile.hint'))).toBeTruthy();
  });

  it('returns to More from the saved-view header back control', () => {
    const onBack = jest.fn();

    render(
      <AppProviders>
        <PuppyProfileSettingsScreen
          onBack={onBack}
          puppy={puppy}
          saveProfile={jest.fn()}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: i18n.t('more.screen-title') }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('formats saved birth dates for the active locale', async () => {
    await i18n.changeLanguage('en');

    render(
      <AppProviders>
        <PuppyProfileSettingsScreen
          puppy={{
            ...puppy,
            age_weeks_estimate: null,
            birth_date: '2026-04-03',
          }}
          saveProfile={jest.fn()}
        />
      </AppProviders>,
    );

    expect(screen.getByText('Apr 3, 2026')).toBeTruthy();
    expect(screen.queryByText('2026-04-03')).toBeNull();
  });

  it('switches to an edit shell for backed fields and saves the edited profile', async () => {
    const saveProfile = jest.fn();

    render(
      <AppProviders>
        <PuppyProfileSettingsScreen
          puppy={puppy}
          saveProfile={saveProfile}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.edit') }));

    expect(screen.getByRole('button', {
      name: i18n.t('more.puppy-profile.save'),
    })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('common.cancel') })).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('more.puppy-profile.field-breed')).props.accessibilityState)
      .toMatchObject({ disabled: true });
    expect(screen.getByLabelText(i18n.t('more.puppy-profile.field-gender')).props.accessibilityState)
      .toMatchObject({ disabled: true });

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('more.puppy-profile.field-name')),
      'Puppy B',
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.puppy-profile.save'),
    }));

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({
        ageMode: 'age_weeks',
        ageWeeksEstimate: 8,
        birthDate: null,
        name: 'Puppy B',
        selectedTrackerIds: puppy.quick_tracker_ids,
      }), puppy.id);
    });
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

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.edit') }));
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

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.edit') }));
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

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.edit') }));
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
