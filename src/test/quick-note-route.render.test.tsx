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
      mutation: { createDetailed: mockCreateDetailed },
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

  it('AC-QN-PERSIST writes the note through the existing durable detailed mutation', async () => {
    renderRoute();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(mockCreateDetailed).toHaveBeenCalledWith(
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
  });

  it('AC-QN-PERSIST keeps the sheet open after a save so the next note costs one tap', async () => {
    renderRoute();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(mockCreateDetailed).toHaveBeenCalled();
    });
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('quick-note-sheet')).toBeTruthy();
  });

  it('AC-QN-PERSIST surfaces a failed write instead of swallowing it', async () => {
    mockCreateDetailed.mockRejectedValue(new Error('offline'));

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
  });

  it('blocks the write for viewers', () => {
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
  });

  it('closes through the modal helper', () => {
    renderRoute();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.close') }));

    expect(mockRouterBack).toHaveBeenCalled();
  });
});
