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
let mockHealthRecords: unknown[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: (href: string) => mockRouterPush(href),
  }),
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({
    careContext: mockCareContext,
    puppy: null,
    status: 'ready',
  }),
}));

jest.mock('@/lib/query/health-records', () => ({
  useHealthRecordsQuery: () => ({
    data: mockHealthRecords,
    isError: false,
    isLoading: false,
  }),
}));

describe('PetRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterPush.mockClear();
    mockHealthRecords = [];
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
});
