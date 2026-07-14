import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import QuickNoteRoute from '../../app/(sheets)/quick-log/note';

const mockRouterBack = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();
const mockCreateDetailed = jest.fn();
const mockCreateDetailedDurably = jest.fn();

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({ fontScale: 1, height: 667, scale: 2, width: 375 }),
  });
});

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    canGoBack: () => mockRouterCanGoBack(),
    replace: (href: string) => mockRouterReplace(href),
  },
}));

jest.mock('@/lib/query/quick-log', () => ({
  ...jest.requireActual('@/lib/query/quick-log'),
  useQuickLogMutationPort: () => mockUseQuickLogMutationPort(),
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

function renderRoute() {
  return render(
    <AppProviders>
      <QuickNoteRoute />
    </AppProviders>,
  );
}

describe('QuickNoteRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
    mockRouterCanGoBack.mockReset();
    mockRouterCanGoBack.mockReturnValue(true);
    mockRouterReplace.mockClear();
    mockCreateDetailed.mockReset();
    mockCreateDetailed.mockResolvedValue(undefined);
    mockCreateDetailedDurably.mockReset();
    mockCreateDetailedDurably.mockResolvedValue(undefined);
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007902',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000007903',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007904',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        createDetailed: mockCreateDetailed,
        createDetailedDurably: mockCreateDetailedDurably,
      },
      mutationEvents: [],
      status: 'ready',
    });
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('AC-QN-FIX-DURABLE writes through the durable-acceptance mutation', async () => {
    renderRoute();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(mockCreateDetailedDurably).toHaveBeenCalledWith(
        expect.objectContaining({
          detailDraft: expect.objectContaining({
            note: 'Synthetic settled note',
            trackerId: 'observation',
          }),
          householdId: '00000000-0000-4000-8000-000000007902',
          puppyId: '00000000-0000-4000-8000-000000007903',
          todayDate: '2026-06-09',
          trackerId: 'observation',
        }),
      );
    });
    expect(mockCreateDetailed).not.toHaveBeenCalled();
  });

  it('AC-QN-FIX-DURABLE returns to the Diary once the draft is durably accepted', async () => {
    renderRoute();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(mockCreateDetailedDurably).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockRouterBack).toHaveBeenCalledTimes(1);
    });
  });

  it('AC-QN-FIX-DURABLE preserves the draft only when durable enqueue rejects', async () => {
    mockCreateDetailedDurably.mockRejectedValue(new Error('synthetic enqueue failure'));

    renderRoute();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    expect(await screen.findByText(i18n.t('quick-note.persistence-error'))).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('quick-note.note-label'))).toHaveProp(
      'value',
      'Synthetic settled note',
    );
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('AC-QN-FIX-STATE renders permission-denied anatomy for viewers', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007902',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000007903',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007904',
      },
      puppy: null,
      status: 'ready',
    });

    renderRoute();

    expect(
      screen.getByRole('button', { name: i18n.t('quick-note.add') }),
    ).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
    expect(screen.getByTestId('quick-log-details-state-permission-denied')).toBeTruthy();
    expect(
      screen.getByText(i18n.t('quick-log.details.states.permission-denied.title')),
    ).toBeTruthy();
  });

  it('AC-QN-FIX-STATE renders pending-write anatomy while the durable queue initializes', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'loading',
    });

    renderRoute();

    expect(screen.getByTestId('quick-log-details-state-pending-write')).toHaveProp(
      'accessibilityLiveRegion',
      'polite',
    );
    expect(screen.getByText(i18n.t('quick-log.details.states.pending-write.title'))).toBeTruthy();
    expect(
      screen.getByRole('button', { name: i18n.t('quick-note.add') }),
    ).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
  });

  it('closes through the modal helper', () => {
    renderRoute();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.close') }));

    expect(mockRouterBack).toHaveBeenCalled();
  });
});
