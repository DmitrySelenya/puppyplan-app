import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';

import {
  HealthRecordEditPreview,
  HealthRecordEditRouteScreen,
} from '@/features/health/screens/HealthScreen';

import HealthRecordEditRoute from '../../app/(modals)/pet/health-record-edit';

const mockRouterBack = jest.fn();
const mockMutateAsync = jest.fn();
const mockCareContext = {
  householdId: '00000000-0000-4000-8000-000000003004',
  householdRole: 'owner',
  puppyId: '00000000-0000-4000-8000-000000003001',
  selectedTrackerIds: ['feeding'],
  todayDate: '2026-07-02',
  userId: '00000000-0000-4000-8000-000000003002',
};

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({
    careContext: mockCareContext,
    puppy: null,
    status: 'ready',
  }),
}));

jest.mock('@/lib/query/health-records', () => ({
  useCreateHealthRecordMutation: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

describe('HealthRecordEditRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue(undefined);
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('AC-PET-ADD renders a record type chooser before the health record form', () => {
    render(<HealthRecordEditRoute />);

    expect(screen.getByRole('button', {
      name: i18n.t('health.add-record.close'),
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('health.add-record.sheet-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.add-record.hint-after-list'))).toBeTruthy();

    const vaccination = screen.getByRole('button', {
      name: i18n.t('health.record-types.vaccination'),
    });

    expect(vaccination).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('health.record-types.deworming'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('health.record-types.prophylaxis'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('health.record-types.vet-visit'),
    })).toBeTruthy();

    expect(screen.queryByText(i18n.t('health.add-record.section-main'))).toBeNull();

    fireEvent.press(vaccination);

    expect(screen.getByText(i18n.t('health.add-record.section-main'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.add-record.section-extra'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.add-record.note-hint'))).toBeTruthy();
    expect(screen.queryByText(/diagnosis|dosage|treatment plan|emergency/i)).toBeNull();
  });

  it('AC-PET-ADD closes the chooser through the modal back action', () => {
    render(<HealthRecordEditRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.add-record.close'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('AC-PET-ADD-STATES renders deterministic loading, pending, error, offline, and permission states', () => {
    render(
      <>
        <HealthRecordEditRouteScreen onClose={mockRouterBack} reviewState="loading" />
        <HealthRecordEditPreview reviewState="pending-write" />
        <HealthRecordEditPreview reviewState="error" />
        <HealthRecordEditPreview reviewState="offline-read" />
        <HealthRecordEditPreview reviewState="permission-denied" />
      </>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
      'permission-denied',
    ] as const) {
      expect(screen.getByTestId(`health-add-record-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`health.add-record.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`health.add-record.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('health-add-record-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('health-add-record-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getByTestId('health-add-record-state-permission-denied').props.accessibilityRole)
      .toBe('alert');
    expect(screen.queryByText(/diagnosis|dosage|treatment plan|emergency/i)).toBeNull();
  });

  it('AC-PET-ADD-DURABLE-2 AC-PET-ADD-DURABLE-4 saves a valid form draft and closes on success', async () => {
    render(<HealthRecordEditRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.record-types.vaccination'),
    }));

    const saveButton = screen.getByRole('button', {
      name: i18n.t('health.add-record.form-save'),
    });
    expect(saveButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('health.add-record.field-name')),
      'DHPP vaccine',
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.add-record.form-save'),
    }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({
      householdId: mockCareContext.householdId,
      notes: '',
      providerName: '',
      puppyId: mockCareContext.puppyId,
      recordType: 'vaccination',
      scheduledFor: mockCareContext.todayDate,
      status: 'template',
      title: 'DHPP vaccine',
      userId: mockCareContext.userId,
    }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
