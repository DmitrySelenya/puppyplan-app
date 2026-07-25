import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';

import HealthRecordDetailRoute from '../../app/(modals)/pet/health-record/[recordId]';

const mockBack = jest.fn();
const mockCareContext = {
  householdId: '00000000-0000-4000-8000-000000003004',
  householdRole: 'owner',
  puppyId: '00000000-0000-4000-8000-000000003001',
  selectedTrackerIds: ['feeding'],
  todayDate: '2026-07-02',
  userId: '00000000-0000-4000-8000-000000003002',
};
const mockRecordId = '00000000-0000-4000-8000-000000003003';
const mockUseHealthRecordDetailQuery = jest.fn();
const mockDeleteMutateAsync = jest.fn();
const mockRestoreMutateAsync = jest.fn();
const mockShowSnackbar = jest.fn();
const mockUpdateMutateAsync = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
  },
  useLocalSearchParams: () => ({
    recordId: mockRecordId,
  }),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'AccessibilityInfo', {
    value: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: jest.fn(() => new Promise<boolean>(() => {})),
    },
  });
});

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({
    careContext: mockCareContext,
    puppy: null,
    status: 'ready',
  }),
}));

jest.mock('@/lib/query/health-records', () => ({
  useDeleteHealthRecordMutation: () => ({
    isPending: false,
    mutateAsync: mockDeleteMutateAsync,
  }),
  useHealthRecordDetailQuery: (
    puppyId: string | undefined,
    recordId: string | undefined,
  ) => mockUseHealthRecordDetailQuery(puppyId, recordId),
  useRestoreHealthRecordMutation: () => ({
    isPending: false,
    mutateAsync: mockRestoreMutateAsync,
  }),
  useUpdateHealthRecordMutation: () => ({
    isPending: false,
    mutateAsync: mockUpdateMutateAsync,
  }),
}));

jest.mock('@/design/primitives/Snackbar', () => ({
  useSnackbar: () => ({
    dismissSnackbar: jest.fn(),
    replaceSnackbar: jest.fn(),
    showSnackbar: mockShowSnackbar,
  }),
}));

describe('HealthRecordDetailRoute', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    mockDeleteMutateAsync.mockReset();
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    mockRestoreMutateAsync.mockReset();
    mockRestoreMutateAsync.mockResolvedValue(undefined);
    mockShowSnackbar.mockReset();
    mockUpdateMutateAsync.mockReset();
    mockUpdateMutateAsync.mockImplementation(async (draft) => ({
      completed_at: draft.status === 'done' ? `${draft.scheduledFor}T12:00:00.000Z` : null,
      created_at: '2026-07-02T08:00:00.000Z',
      deleted_at: null,
      id: draft.id,
      notes: draft.notes.trim().length > 0 ? draft.notes.trim() : null,
      provider_name: draft.providerName.trim().length > 0 ? draft.providerName.trim() : null,
      puppy_id: draft.puppyId,
      record_type: draft.recordType,
      scheduled_for: draft.scheduledFor,
      source: draft.source,
      status: draft.status,
      title: draft.title.trim(),
      updated_at: draft.updatedAt,
      updated_by: draft.userId,
      version: 2,
    }));
    mockUseHealthRecordDetailQuery.mockReset();
    mockUseHealthRecordDetailQuery.mockReturnValue({
      data: {
        completed_at: null,
        created_at: '2026-07-02T08:00:00.000Z',
        deleted_at: null,
        id: mockRecordId,
        notes: 'Bring the paper record',
        provider_name: 'Clay Vet',
        puppy_id: mockCareContext.puppyId,
        record_type: 'vaccination',
        scheduled_for: '2026-07-02',
        source: 'manual',
        status: 'confirmed',
        title: 'DHPP booster',
        updated_at: '2026-07-02T08:00:00.000Z',
        updated_by: mockCareContext.userId,
        version: 1,
      },
      isError: false,
      isLoading: false,
    });
    await i18n.changeLanguage('en');
  });

  it('AC-PET-DETAIL-3 renders the selected server health record in the detail anatomy', () => {
    render(<HealthRecordDetailRoute />);

    expect(mockUseHealthRecordDetailQuery).toHaveBeenCalledWith(
      mockCareContext.puppyId,
      mockRecordId,
    );
    expect(screen.getByText('DHPP booster')).toBeTruthy();
    expect(screen.getByText('2026-07-02')).toBeTruthy();
    expect(screen.getByText('Clay Vet')).toBeTruthy();
    expect(screen.getByText('Bring the paper record')).toBeTruthy();
    expect(screen.getAllByText(i18n.t('health.pills.confirmed')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', {
      name: i18n.t('health.add-record.form-cancel'),
    }).length).toBeGreaterThan(0);
  });

  it('AC-PET-DELETE-PROD-1 AC-PET-DELETE-PROD-2 AC-PET-DELETE-PROD-3 AC-PET-DELETE-PROD-4 soft-deletes, closes, and restores from the 5-second undo snackbar', async () => {
    render(<HealthRecordDetailRoute />);

    expect(screen.getByRole('button', {
      name: i18n.t('health.edit-record.delete-action'),
    })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.edit-record.delete-confirm.destructive'),
    }));

    await waitFor(() => expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
      affectedDate: '2026-07-02',
      deletedAt: expect.any(String),
      householdId: mockCareContext.householdId,
      id: mockRecordId,
      puppyId: mockCareContext.puppyId,
      updatedAt: expect.any(String),
      userId: mockCareContext.userId,
    }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      durationMs: 5000,
      hapticEvent: 'warning',
      message: i18n.t('health.edit-record.delete-undo-toast'),
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.snackbar.undo'),
      }),
      tone: 'warning',
    }));

    const snackbarMessage = mockShowSnackbar.mock.calls[0]?.[0];
    snackbarMessage.primaryAction.onPress();

    await waitFor(() => expect(mockRestoreMutateAsync).toHaveBeenCalledWith({
      affectedDate: '2026-07-02',
      deletedAt: expect.any(String),
      householdId: mockCareContext.householdId,
      id: mockRecordId,
      puppyId: mockCareContext.puppyId,
      updatedAt: expect.any(String),
      userId: mockCareContext.userId,
    }));
  });

  it('AC-PET-DELETE-PROD-5 keeps the detail route visible and shows the error state when delete fails', async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error('delete failed'));

    render(<HealthRecordDetailRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('health.edit-record.delete-confirm.destructive'),
    }));

    await waitFor(() => expect(screen.getByTestId('health-record-detail-state-error')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });

  it('AC-PET-EDIT-PROD-1 AC-PET-EDIT-PROD-2 AC-PET-EDIT-PROD-3 AC-PET-EDIT-PROD-4 edits a dirty server record and keeps the route open', async () => {
    render(<HealthRecordDetailRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('common.edit'),
    }));

    const titleInput = screen.getByLabelText(i18n.t('health.add-record.field-name'));
    expect(titleInput.props.value).toBe('DHPP booster');
    expect(screen.getByText('2026-07-02')).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('health.add-record.field-clinic')).props.value)
      .toBe('Clay Vet');
    expect(screen.getByLabelText(i18n.t('health.add-record.field-note')).props.value)
      .toBe('Bring the paper record');

    const saveButton = screen.getByRole('button', {
      name: i18n.t('common.save'),
    });
    expect(saveButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(titleInput, 'DHPP booster updated');
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('common.save'),
    }));

    await waitFor(() => expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      householdId: mockCareContext.householdId,
      id: mockRecordId,
      notes: 'Bring the paper record',
      previousScheduledFor: '2026-07-02',
      providerName: 'Clay Vet',
      puppyId: mockCareContext.puppyId,
      recordType: 'vaccination',
      scheduledFor: '2026-07-02',
      source: 'manual',
      status: 'confirmed',
      title: 'DHPP booster updated',
      updatedAt: expect.any(String),
      userId: mockCareContext.userId,
    }));
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(i18n.t('health.add-record.field-name'))).toBeNull();
    expect(screen.getByText('DHPP booster updated')).toBeTruthy();
  });

  it('AC-PET-EDIT-PROD-5 keeps the edit form visible and shows the form error state when save fails', async () => {
    mockUpdateMutateAsync.mockRejectedValue(new Error('update failed'));

    render(<HealthRecordDetailRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('common.edit'),
    }));
    fireEvent.changeText(
      screen.getByLabelText(i18n.t('health.add-record.field-note')),
      'Updated notes',
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('common.save'),
    }));

    await waitFor(() => expect(screen.getByTestId('health-add-record-state-error')).toBeTruthy());
    expect(screen.getByLabelText(i18n.t('health.add-record.field-note')).props.value)
      .toBe('Updated notes');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
