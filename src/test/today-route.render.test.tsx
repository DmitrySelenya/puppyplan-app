import { Share } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import type { QuickLogEventActionHandlers } from '@/lib/query/quick-log-event-view';
import type { TodayScreenProps } from '@/features/today/screens/TodayScreen';
import { AppProviders } from '@/lib/providers/AppProviders';
import { i18n } from '@/lib/i18n';

import DiaryRoute from '../../app/(tabs)/diary';

const mockRouterPush = jest.fn();
const mockDismissSnackbar = jest.fn();
const mockReplaceSnackbar = jest.fn();
const mockShowSnackbar = jest.fn();
const mockCaptureException = jest.fn();
const mockDeleteReminderMutate = jest.fn();
const mockDeleteReminderReset = jest.fn();
const mockToggleReminderReset = jest.fn();
const mockUseDeleteReminderMutation = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();
const mockUseToggleReminderEnabledMutation = jest.fn();
const mockToggleReminderMutate = jest.fn();
const pausedSnackbarKey = 'reminders.lifecycle.paused-snackbar';
const pausedSnackbarCopyByLocale = {
  en: 'Paused. Find it in Reminders → Off.',
  es: 'Pausado. Encuéntralo en Recordatorios → Apagado.',
  ru: 'Приостановлено. Найдите напоминание в «Напоминания» → «Выключенные».',
} as const;
let capturedActions: QuickLogEventActionHandlers | undefined;
type DiaryParityScreenProps = TodayScreenProps & Readonly<{
  onDeleteReminder?: (reminderId: string) => void;
  onEditReminder?: (reminderId: string) => void;
  reminderLifecycleScopeKey?: string;
  reminderMutationErrorId?: string;
  onShareText?: (text: string) => Promise<void> | void;
  onToggleReminder?: (reminderId: string, enabled: boolean) => void;
}>;

let capturedProps: DiaryParityScreenProps | undefined;

jest.mock('expo-router', () => ({
  router: {
    push: (href: unknown) => mockRouterPush(href),
  },
}));

jest.mock('@/features/today/screens/TodayScreen', () => {
  const actual = jest.requireActual('@/features/today/screens/TodayScreen');

  return {
    ...actual,
    TodayScreen: (props: TodayScreenProps) => {
      capturedActions = props.actions;
      capturedProps = props as DiaryParityScreenProps;

      return null;
    },
  };
});

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

jest.mock('@/lib/query/quick-log', () => ({
  useQuickLogMutationPort: () => mockUseQuickLogMutationPort(),
}));

jest.mock('@/lib/query/reminders', () => {
  const actual = jest.requireActual<typeof import('@/lib/query/reminders')>(
    '@/lib/query/reminders',
  );

  return {
    ...actual,
    useDeleteReminderMutation: () => mockUseDeleteReminderMutation(),
    useToggleReminderEnabledMutation: () => mockUseToggleReminderEnabledMutation(),
  };
});

jest.mock('@/design/primitives/Snackbar', () => {
  const actual = jest.requireActual<typeof import('@/design/primitives/Snackbar')>(
    '@/design/primitives/Snackbar',
  );

  return {
    ...actual,
    useSnackbar: () => ({
      dismissSnackbar: mockDismissSnackbar,
      replaceSnackbar: mockReplaceSnackbar,
      showSnackbar: mockShowSnackbar,
    }),
  };
});

jest.mock('@/lib/observability', () => {
  const actual = jest.requireActual<typeof import('@/lib/observability')>('@/lib/observability');

  return {
    ...actual,
    createObservabilityReporter: () => ({
      captureException: mockCaptureException,
    }),
  };
});

describe('DiaryRoute Quick Log recovery wiring', () => {
  beforeEach(async () => {
    capturedActions = undefined;
    capturedProps = undefined;
    mockRouterPush.mockClear();
    mockDismissSnackbar.mockReset();
    mockReplaceSnackbar.mockReset();
    mockShowSnackbar.mockReset();
    mockCaptureException.mockReset();
    mockDeleteReminderMutate.mockReset();
    mockToggleReminderMutate.mockReset();
    mockDeleteReminderReset.mockReset();
    mockToggleReminderReset.mockReset();
    mockUseDeleteReminderMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockDeleteReminderMutate,
      reset: mockDeleteReminderReset,
      variables: undefined,
    });
    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockToggleReminderMutate,
      reset: mockToggleReminderReset,
      variables: undefined,
    });
    await i18n.changeLanguage('en');
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007001',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000007002',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007003',
      },
      puppy: {
        age_weeks_estimate: 8,
        birth_date: null,
        created_at: '2026-06-03T21:00:00.000Z',
        deleted_at: null,
        household_id: '00000000-0000-4000-8000-000000007001',
        household_role: 'owner',
        id: '00000000-0000-4000-8000-000000007002',
        name: 'Synthetic Test Puppy',
        quick_tracker_ids: ['feeding'],
        updated_at: '2026-06-03T21:00:00.000Z',
      },
      status: 'ready',
    });
  });

  it('passes retry, delete, and undo handlers from the production mutation port', () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    capturedActions?.onRetry?.('evt_00000000-0000-4000-8000-000000007101', 'manual_retry', 'today');
    capturedActions?.onDelete?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'failed',
      todayDate: '2026-06-09',
    });
    capturedActions?.onUndo?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
    });

    expect(mutation.retry).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000007101',
      'manual_retry',
      'today',
    );
    expect(mutation.deleteLocal).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000007101',
    );
    expect(mutation.undo).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
    });
  });

  it('AC-P5-CHECKOFF wires an actual-time linked fact through the insert path', async () => {
    // The reminder link the check-off carries is what lets the insert restore the slot's row after
    // an un-check, so the route has no separate check-off call to make.
    const createDetailed = jest.fn().mockResolvedValue({ id: 'synthetic-event' });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        createDetailed,
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        restoreSynced: jest.fn(),
        updateDetails: jest.fn(),
        undo: jest.fn(),
      },
      mutationEvents: [],
      status: 'ready',
    });
    render(<AppProviders><DiaryRoute /></AppProviders>);

    await capturedProps?.onCheckOff?.({
      displayAt: '2026-06-09T08:00:00.000Z',
      kind: 'planned',
      plannedAt: '2026-06-09T08:00:00.000Z',
      reminderId: '00000000-0000-4000-8000-000000007301',
      scheduledFor: '2026-06-09T08:00:00.000Z',
      status: 'upcoming',
      time: '08:00',
      trackerId: 'sleep',
    });

    expect(createDetailed).toHaveBeenCalledWith(expect.objectContaining({
      detailDraft: expect.objectContaining({ trackerId: 'sleep' }),
      householdId: '00000000-0000-4000-8000-000000007001',
      occurredAt: expect.not.stringMatching('2026-06-09T08:00:00.000Z'),
      reminderLink: {
        reminderId: '00000000-0000-4000-8000-000000007301',
        scheduledFor: '2026-06-09T08:00:00.000Z',
      },
    }));
  });

  it('AC-DIARY-DELETE-UNDO-1 AC-DIARY-DELETE-UNDO-2 AC-DIARY-DELETE-UNDO-3 shows undo snackbar after synced Diary delete and restores from it', async () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(async () => undefined),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    await Promise.resolve(capturedActions?.onDelete?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    }));

    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      durationMs: 5000,
      hapticEvent: 'warning',
      message: i18n.t('timeline.delete-snackbar'),
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.snackbar.undo'),
      }),
      tone: 'warning',
    })));

    const snackbarMessage = mockShowSnackbar.mock.calls[0]?.[0];
    snackbarMessage.primaryAction.onPress();

    await waitFor(() => expect(mutation.restoreSynced).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
    }));
    await waitFor(() => expect(mockDismissSnackbar).toHaveBeenCalledWith(
      'quick-log-synced-delete:evt_00000000-0000-4000-8000-000000007101',
    ));
    expect(mutation.deleteLocal).not.toHaveBeenCalled();
  });

  it('AC-P1-RECOVERY-10 keeps a persistence-failed synced delete on Done and exposes existing Retry copy', async () => {
    const persistenceFailure = new Error('Synthetic delete-intent persistence failure');
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn()
        .mockRejectedValueOnce(persistenceFailure)
        .mockResolvedValueOnce(undefined),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007102',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      message: i18n.t('timeline.delete-failed'),
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.failed.primary'),
      }),
      tone: 'error',
    })));

    const snackbarMessage = mockShowSnackbar.mock.calls[0]?.[0];
    snackbarMessage.primaryAction.onPress();
    await waitFor(() => expect(mutation.deleteSynced).toHaveBeenCalledTimes(2));
    expect(mutation.deleteSynced).toHaveBeenLastCalledWith({
      clientEventId: request.clientEventId,
      eventType: request.eventType,
      householdId: request.householdId,
      puppyId: request.puppyId,
      todayDate: request.todayDate,
    });
  });

  it('AC-P1-RECOVERY-10 turns a successful persistence Retry into the normal reachable Undo snackbar', async () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn()
        .mockRejectedValueOnce(new Error('Synthetic first persistence failure'))
        .mockResolvedValueOnce(undefined),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007104',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      message: i18n.t('timeline.delete-failed'),
      primaryAction: expect.objectContaining({ label: i18n.t('quick-log.failed.primary') }),
      tone: 'error',
    })));
    const failureSnackbar = mockShowSnackbar.mock.calls[0]?.[0];
    failureSnackbar.primaryAction.onPress();

    await waitFor(() => {
      const retrySuccessSnackbar = [
        ...mockShowSnackbar.mock.calls.slice(1),
        ...mockReplaceSnackbar.mock.calls,
      ].map(([message]) => message).find((message) =>
        message.message === i18n.t('timeline.delete-snackbar'));
      expect(retrySuccessSnackbar).toEqual(expect.objectContaining({
        durationMs: 5000,
        hapticEvent: 'warning',
        message: i18n.t('timeline.delete-snackbar'),
        primaryAction: expect.objectContaining({
          label: i18n.t('quick-log.snackbar.undo'),
        }),
        tone: 'warning',
      }));
    });

    const undoSnackbar = [
      ...mockShowSnackbar.mock.calls.slice(1),
      ...mockReplaceSnackbar.mock.calls,
    ].map(([message]) => message).find((message) =>
      message.message === i18n.t('timeline.delete-snackbar'));
    undoSnackbar.primaryAction.onPress();
    await waitFor(() => expect(mutation.restoreSynced).toHaveBeenCalledWith({
      clientEventId: request.clientEventId,
      eventType: request.eventType,
      householdId: request.householdId,
      puppyId: request.puppyId,
      todayDate: request.todayDate,
    }));
  });

  it('AC-P1-RECOVERY-10 keeps a second synced-delete persistence Retry visibly failed and reports it', async () => {
    const privateMarker = 'private-synced-delete-retry-marker';
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn()
        .mockRejectedValueOnce(new Error('Synthetic first persistence failure'))
        .mockRejectedValueOnce(new Error(privateMarker)),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007103',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      message: i18n.t('timeline.delete-failed'),
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.failed.primary'),
      }),
      tone: 'error',
    })));

    const firstFailure = mockShowSnackbar.mock.calls[0]?.[0];
    firstFailure.primaryAction.onPress();

    await waitFor(() => expect(mockReplaceSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      message: i18n.t('timeline.delete-failed'),
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.failed.primary'),
      }),
      tone: 'error',
    })));
    expect(mockDismissSnackbar).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ operation: 'synced_delete_retry' }),
    );
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(privateMarker);
  });

  it('AC-P3-ACTOR-2 dismisses and disables actor A Undo when the mutation/auth identity changes', async () => {
    const actorAMutation = {
      actorId: '00000000-0000-4000-8000-000000007003',
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(async () => undefined),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    const actorBMutation = {
      ...actorAMutation,
      actorId: '00000000-0000-4000-8000-000000007099',
      deleteSynced: jest.fn(async () => undefined),
      restoreSynced: jest.fn(async () => undefined),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: actorAMutation,
      mutationEvents: [],
      status: 'ready',
    });
    const screen = render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007105',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      id: `quick-log-synced-delete:${request.clientEventId}`,
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.snackbar.undo'),
      }),
    })));
    const actorAUndo = mockShowSnackbar.mock.calls[0]?.[0].primaryAction.onPress;
    mockDismissSnackbar.mockClear();
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: actorBMutation,
      mutationEvents: [],
      status: 'ready',
    });

    screen.rerender(<AppProviders><DiaryRoute /></AppProviders>);
    await waitFor(() => expect(mockDismissSnackbar).toHaveBeenCalledWith(
      `quick-log-synced-delete:${request.clientEventId}`,
    ));
    actorAUndo();
    await Promise.resolve();

    expect({
      actorARestores: actorAMutation.restoreSynced.mock.calls.length,
      actorBRestores: actorBMutation.restoreSynced.mock.calls.length,
    }).toEqual({
      actorARestores: 0,
      actorBRestores: 0,
    });
  });

  it('AC-P3-ACTOR-2 dismisses and disables actor A persistence Retry when the mutation/auth identity changes', async () => {
    const actorAMutation = {
      actorId: '00000000-0000-4000-8000-000000007003',
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(async () => {
        throw new Error('Synthetic actor A persistence failure');
      }),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    const actorBMutation = {
      ...actorAMutation,
      actorId: '00000000-0000-4000-8000-000000007099',
      deleteSynced: jest.fn(async () => undefined),
      restoreSynced: jest.fn(async () => undefined),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: actorAMutation,
      mutationEvents: [],
      status: 'ready',
    });
    const screen = render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007106',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      id: `quick-log-synced-delete-error:${request.clientEventId}`,
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.failed.primary'),
      }),
    })));
    const actorARetry = mockShowSnackbar.mock.calls[0]?.[0].primaryAction.onPress;
    mockDismissSnackbar.mockClear();
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: actorBMutation,
      mutationEvents: [],
      status: 'ready',
    });

    screen.rerender(<AppProviders><DiaryRoute /></AppProviders>);
    await waitFor(() => expect(mockDismissSnackbar).toHaveBeenCalledWith(
      `quick-log-synced-delete-error:${request.clientEventId}`,
    ));
    actorARetry();
    await Promise.resolve();

    expect({
      actorADeletes: actorAMutation.deleteSynced.mock.calls.length,
      actorBDeletes: actorBMutation.deleteSynced.mock.calls.length,
    }).toEqual({
      actorADeletes: 1,
      actorBDeletes: 0,
    });
  });

  it('AC-P3-ACTOR-6 dismisses and disables an active synced-delete Undo when its route unmounts without an auth rerender', async () => {
    const mutation = {
      actorId: '00000000-0000-4000-8000-000000007003',
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(async () => undefined),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });
    const screen = render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007108',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      id: `quick-log-synced-delete:${request.clientEventId}`,
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.snackbar.undo'),
      }),
    })));
    const retainedUndo = mockShowSnackbar.mock.calls[0]?.[0].primaryAction.onPress;
    mockDismissSnackbar.mockClear();
    mockReplaceSnackbar.mockClear();

    screen.unmount();
    expect(mockDismissSnackbar).toHaveBeenCalledTimes(1);
    expect(mockDismissSnackbar).toHaveBeenCalledWith(
      `quick-log-synced-delete:${request.clientEventId}`,
    );
    retainedUndo();
    retainedUndo();
    await Promise.resolve();

    expect({
      deleteCalls: mutation.deleteSynced.mock.calls.length,
      replaceCalls: mockReplaceSnackbar.mock.calls.length,
      restoreCalls: mutation.restoreSynced.mock.calls.length,
    }).toEqual({
      deleteCalls: 1,
      replaceCalls: 0,
      restoreCalls: 0,
    });
  });

  it('AC-P3-ACTOR-6 dismisses and disables an active synced-delete error Retry when its route unmounts without an auth rerender', async () => {
    const mutation = {
      actorId: '00000000-0000-4000-8000-000000007003',
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(async () => {
        throw new Error('Synthetic persistence failure');
      }),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });
    const screen = render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007109',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      id: `quick-log-synced-delete-error:${request.clientEventId}`,
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.failed.primary'),
      }),
    })));
    const retainedRetry = mockShowSnackbar.mock.calls[0]?.[0].primaryAction.onPress;
    mockDismissSnackbar.mockClear();
    mockReplaceSnackbar.mockClear();
    mockCaptureException.mockClear();

    screen.unmount();
    expect(mockDismissSnackbar).toHaveBeenCalledTimes(1);
    expect(mockDismissSnackbar).toHaveBeenCalledWith(
      `quick-log-synced-delete-error:${request.clientEventId}`,
    );
    retainedRetry();
    retainedRetry();
    await Promise.resolve();

    expect({
      captureCalls: mockCaptureException.mock.calls.length,
      deleteCalls: mutation.deleteSynced.mock.calls.length,
      replaceCalls: mockReplaceSnackbar.mock.calls.length,
      restoreCalls: mutation.restoreSynced.mock.calls.length,
    }).toEqual({
      captureCalls: 0,
      deleteCalls: 1,
      replaceCalls: 0,
      restoreCalls: 0,
    });
  });

  it('AC-P3-ACTOR-2 AC-P3-ACTOR-6 retains the five-second Undo action when a same-actor rerender replaces the mutation port object', async () => {
    const mutation = {
      actorId: '00000000-0000-4000-8000-000000007003',
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(async () => undefined),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    const replacementMutation = {
      ...mutation,
      deleteSynced: jest.fn(async () => undefined),
      restoreSynced: jest.fn(async () => undefined),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });
    const screen = render(<AppProviders><DiaryRoute /></AppProviders>);
    const request = {
      clientEventId: 'evt_00000000-0000-4000-8000-000000007107',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    } as const;

    await Promise.resolve(capturedActions?.onDelete?.(request));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      durationMs: 5000,
      id: `quick-log-synced-delete:${request.clientEventId}`,
    })));
    const undo = mockShowSnackbar.mock.calls[0]?.[0].primaryAction.onPress;
    mockDismissSnackbar.mockClear();

    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: replacementMutation,
      mutationEvents: [],
      status: 'ready',
    });
    screen.rerender(<AppProviders><DiaryRoute /></AppProviders>);
    expect(mockDismissSnackbar).not.toHaveBeenCalled();
    undo();

    await waitFor(() => expect(mutation.restoreSynced).toHaveBeenCalledTimes(1));
    expect(mutation.restoreSynced).toHaveBeenCalledWith({
      clientEventId: request.clientEventId,
      eventType: request.eventType,
      householdId: request.householdId,
      puppyId: request.puppyId,
      todayDate: request.todayDate,
    });
    expect(replacementMutation.restoreSynced).not.toHaveBeenCalled();
  });

  it('AC-P1-RECOVERY-10 leaves write actions unavailable when the queue cannot open', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(<AppProviders><DiaryRoute /></AppProviders>);

    expect(capturedActions).toBeUndefined();
    expect(capturedProps?.onCheckOff).toBeUndefined();
  });

  it('derives the production Diary day number from the active puppy profile date', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    expect(capturedProps?.todayPlanInput).toMatchObject({
      dayNumber: 7,
    });
  });

  it('wires the Diary hero primary action to the Quick Log modal', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    capturedProps?.openQuickLog?.();

    expect(mockRouterPush).toHaveBeenCalledWith('/quick-log');
  });

  it('AC-DIARY-NAV-1 wires the Diary schedule action to the schedule sheet', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    capturedProps?.openTimeline?.();

    expect(mockRouterPush).toHaveBeenCalledWith('/quick-log/schedule');
  });

  it('AC-P4-MENU-1 AC-P4-MENU-2 AC-P4-MENU-3 wires Diary lifecycle actions to edit and active-care mutations', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T08:30:00.000Z'));
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    try {
      render(<AppProviders><DiaryRoute /></AppProviders>);
      const reminderId = '00000000-0000-4000-8000-000000007901';

      expect(capturedProps?.reminderLifecycleScopeKey).toBe([
        '00000000-0000-4000-8000-000000007003',
        '00000000-0000-4000-8000-000000007001',
        '00000000-0000-4000-8000-000000007002',
        'owner',
      ].join(':'));

      capturedProps?.onEditReminder?.(reminderId);
      capturedProps?.onToggleReminder?.(reminderId, false);
      capturedProps?.onToggleReminder?.(reminderId, true);
      capturedProps?.onDeleteReminder?.(reminderId);

      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/reminders/edit',
        params: { reminderId },
      });
      expect(mockToggleReminderMutate).toHaveBeenNthCalledWith(1, {
        enabled: false,
        householdId: '00000000-0000-4000-8000-000000007001',
        puppyId: '00000000-0000-4000-8000-000000007002',
        reminderId,
        todayDate: '2026-06-09',
      }, expect.objectContaining({
        onSuccess: expect.any(Function),
      }));
      expect(mockToggleReminderMutate).toHaveBeenNthCalledWith(2, {
        enabled: true,
        householdId: '00000000-0000-4000-8000-000000007001',
        puppyId: '00000000-0000-4000-8000-000000007002',
        reminderId,
        todayDate: '2026-06-09',
      });
      expect(mockDeleteReminderMutate).toHaveBeenCalledWith({
        deletedAt: '2026-07-03T08:30:00.000Z',
        householdId: '00000000-0000-4000-8000-000000007001',
        puppyId: '00000000-0000-4000-8000-000000007002',
        reminderId,
        todayDate: '2026-06-09',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(Object.entries(pausedSnackbarCopyByLocale) as [keyof typeof pausedSnackbarCopyByLocale, string][])(
    'AC-P36-7 resolves the locked paused Snackbar copy in %s',
    async (locale, expectedCopy) => {
      await i18n.changeLanguage(locale);

      expect(i18n.t(pausedSnackbarKey)).toBe(expectedCopy);
    },
  );

  it('AC-P36-7 emits exactly one success-only Diary pause Snackbar and none for Resume or rejection', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });
    const view = render(<AppProviders><DiaryRoute /></AppProviders>);
    const reminderId = '00000000-0000-4000-8000-000000007901';

    capturedProps?.onToggleReminder?.(reminderId, false);
    expect(mockShowSnackbar).not.toHaveBeenCalled();
    expect(mockToggleReminderMutate).toHaveBeenCalledWith({
      enabled: false,
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      reminderId,
      todayDate: '2026-06-09',
    }, expect.objectContaining({
      onSuccess: expect.any(Function),
    }));

    const pauseOptions = mockToggleReminderMutate.mock.calls[0]?.[1];
    pauseOptions?.onSuccess?.();

    expect(mockShowSnackbar).toHaveBeenCalledTimes(1);
    const [pausedSnackbar] = mockShowSnackbar.mock.calls[0] ?? [];
    expect(pausedSnackbar).toEqual(expect.objectContaining({
      accessibilityLabel: pausedSnackbarCopyByLocale.en,
      id: 'reminder-lifecycle-paused',
      message: pausedSnackbarCopyByLocale.en,
    }));
    expect(['info', 'success']).toContain(pausedSnackbar?.tone);
    expect(pausedSnackbar).not.toHaveProperty('durationMs');
    expect(pausedSnackbar).not.toHaveProperty('primaryAction');
    expect(pausedSnackbar).not.toHaveProperty('secondaryAction');

    capturedProps?.onToggleReminder?.(reminderId, true);
    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockToggleReminderMutate,
      reset: mockToggleReminderReset,
      variables: {
        enabled: true,
        householdId: '00000000-0000-4000-8000-000000007001',
        puppyId: '00000000-0000-4000-8000-000000007002',
        reminderId,
        todayDate: '2026-06-09',
      },
    });
    view.rerender(<AppProviders><DiaryRoute /></AppProviders>);

    expect(mockShowSnackbar).toHaveBeenCalledTimes(1);

    capturedProps?.onToggleReminder?.(reminderId, false);
    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: true,
      isPending: false,
      mutate: mockToggleReminderMutate,
      reset: mockToggleReminderReset,
      variables: {
        enabled: false,
        householdId: '00000000-0000-4000-8000-000000007001',
        puppyId: '00000000-0000-4000-8000-000000007002',
        reminderId,
        todayDate: '2026-06-09',
      },
    });
    view.rerender(<AppProviders><DiaryRoute /></AppProviders>);

    expect(capturedProps?.reminderMutationErrorId).toBe(reminderId);
    expect(mockShowSnackbar).toHaveBeenCalledTimes(1);
  });

  it.each(['delete', 'toggle'] as const)(
    'AC-P4-MENU-ERR exposes a scoped recoverable Diary error when the %s mutation fails',
    (mutationKind) => {
      mockUseQuickLogMutationPort.mockReturnValue({
        mutation: undefined,
        mutationEvents: [],
        status: 'unavailable',
      });
      const failedMutation = {
        isError: true,
        isPending: false,
        mutate: mutationKind === 'delete' ? mockDeleteReminderMutate : mockToggleReminderMutate,
        variables: {
          reminderId: '00000000-0000-4000-8000-000000007901',
        },
      };

      if (mutationKind === 'delete') {
        mockUseDeleteReminderMutation.mockReturnValue(failedMutation);
      } else {
        mockUseToggleReminderEnabledMutation.mockReturnValue(failedMutation);
      }

      render(<AppProviders><DiaryRoute /></AppProviders>);

      expect(capturedProps?.reminderMutationErrorId)
        .toBe('00000000-0000-4000-8000-000000007901');
    },
  );

  it('AC-P4-MENU-ERR wires the Diary error clear callback to both mutation resets', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(<AppProviders><DiaryRoute /></AppProviders>);

    capturedProps?.onClearReminderMutationError?.();

    expect(mockDeleteReminderReset).toHaveBeenCalledTimes(1);
    expect(mockToggleReminderReset).toHaveBeenCalledTimes(1);
  });

  it('AC-P33-CORRECT opens update details with routing-only params and never places private content in the URL', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        createDetailed: jest.fn(),
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        restoreSynced: jest.fn(),
        updateDetails: jest.fn(),
        undo: jest.fn(),
      },
      mutationEvents: [],
      status: 'ready',
    });

    render(<AppProviders><DiaryRoute /></AppProviders>);

    capturedActions?.onEdit?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007801',
      eventType: 'observation',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
      trackerId: 'observation',
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/quick-log/details',
      params: {
        clientEventId: 'evt_00000000-0000-4000-8000-000000007801',
        eventType: 'observation',
        householdId: '00000000-0000-4000-8000-000000007001',
        puppyId: '00000000-0000-4000-8000-000000007002',
        todayDate: '2026-06-09',
        trackerId: 'observation',
      },
    });
    expect(JSON.stringify(mockRouterPush.mock.calls)).not.toContain('Synthetic private context');
    expect(JSON.stringify(mockRouterPush.mock.calls)).not.toContain('note');
    expect(JSON.stringify(mockRouterPush.mock.calls)).not.toContain('payload');
  });

  it('AC-P33-EXPORT invokes the native share sheet only after the explicit screen action', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });
    render(<AppProviders><DiaryRoute /></AppProviders>);

    expect(share).not.toHaveBeenCalled();
    await capturedProps?.onShareText?.('08:10 Feeding — synthetic context');

    expect(share).toHaveBeenCalledWith({
      message: '08:10 Feeding — synthetic context',
    });
    share.mockRestore();
  });

  it('does not expose write handlers for viewer care contexts', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007001',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000007002',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007003',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        updateDetails: jest.fn(),
        undo: jest.fn(),
      },
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    expect(capturedActions).toBeUndefined();
    expect(capturedProps?.onCheckOff).toBeUndefined();
    expect(capturedProps?.onDeleteReminder).toBeUndefined();
    expect(capturedProps?.onEditReminder).toBeUndefined();
    expect(capturedProps?.onShareText).toEqual(expect.any(Function));
    expect(capturedProps?.onToggleReminder).toBeUndefined();
  });
});
