import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';

import PetRoute from '../../app/(tabs)/pet';

const mockRouterPush = jest.fn();
const mockCareContext = {
  householdId: '00000000-0000-4000-8000-000000003004',
  householdRole: 'owner',
  puppyId: '00000000-0000-4000-8000-000000003001',
  selectedTrackerIds: ['feeding'],
  todayDate: '2026-07-02',
  userId: '00000000-0000-4000-8000-000000003002',
};
let mockActiveCareStatus: 'error' | 'loading' | 'ready' = 'ready';
let mockHealthRecords: unknown[] = [];
let mockHealthRecordsError = false;
let mockHealthRecordsLoading = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: (href: string) => mockRouterPush(href),
  }),
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({
    careContext: mockActiveCareStatus === 'ready' ? mockCareContext : null,
    puppy: null,
    status: mockActiveCareStatus,
  }),
}));

jest.mock('@/lib/query/health-records', () => ({
  useHealthRecordsQuery: () => ({
    data: mockHealthRecords,
    isError: mockHealthRecordsError,
    isLoading: mockHealthRecordsLoading,
  }),
}));

describe('PetRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterPush.mockClear();
    mockActiveCareStatus = 'ready';
    mockHealthRecords = [];
    mockHealthRecordsError = false;
    mockHealthRecordsLoading = false;
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

  it('AC-PET-STATES-3 renders Pet Health loading and error states from the production route queries', () => {
    mockHealthRecordsLoading = true;
    const loading = render(<PetRoute />);

    expect(screen.getByTestId('health-main-state-loading')).toBeTruthy();
    expect(screen.getByText(i18n.t('health.states.loading.title'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('health.empty.title'))).toBeNull();
    loading.unmount();

    mockHealthRecordsLoading = false;
    mockHealthRecordsError = true;
    const queryError = render(<PetRoute />);

    expect(screen.getByTestId('health-main-state-error')).toBeTruthy();
    expect(screen.queryByText(i18n.t('health.empty.title'))).toBeNull();
    queryError.unmount();

    mockHealthRecordsError = false;
    mockActiveCareStatus = 'error';
    render(<PetRoute />);

    expect(screen.getByTestId('health-main-state-error')).toBeTruthy();
    expect(screen.getByTestId('pet-profile-hub-card')).toBeTruthy();
  });

  it('AC-PET-ADD-DURABLE-3 renders health records from the typed route query', () => {
    mockHealthRecords = [{
      completed_at: null,
      created_at: '2026-07-02T08:00:00.000Z',
      deleted_at: null,
      id: '00000000-0000-4000-8000-000000003003',
      notes: null,
      provider_name: null,
      puppy_id: mockCareContext.puppyId,
      record_type: 'vaccination',
      scheduled_for: '2026-07-02',
      source: 'manual',
      status: 'template',
      title: 'DHPP vaccine',
      updated_at: '2026-07-02T08:00:00.000Z',
      updated_by: mockCareContext.userId,
      version: 1,
    }];

    render(<PetRoute />);

    expect(screen.getByText('DHPP vaccine')).toBeTruthy();
    expect(screen.getByText('2026-07-02')).toBeTruthy();
    expect(screen.getByText(i18n.t('health.pills.template'))).toBeTruthy();
  });

  it('AC-PET-DETAIL-1 routes a server health record row to its detail modal', () => {
    mockHealthRecords = [{
      completed_at: null,
      created_at: '2026-07-02T08:00:00.000Z',
      deleted_at: null,
      id: '00000000-0000-4000-8000-000000003003',
      notes: null,
      provider_name: null,
      puppy_id: mockCareContext.puppyId,
      record_type: 'vaccination',
      scheduled_for: '2026-07-02',
      source: 'manual',
      status: 'confirmed',
      title: 'DHPP vaccine',
      updated_at: '2026-07-02T08:00:00.000Z',
      updated_by: mockCareContext.userId,
      version: 1,
    }];

    render(<PetRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: [
        'DHPP vaccine',
        i18n.t('health.pills.confirmed'),
        '2026-07-02',
      ].join('. '),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/pet/health-record/[recordId]',
      params: { recordId: '00000000-0000-4000-8000-000000003003' },
    });
  });
});
