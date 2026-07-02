import { AccessibilityInfo } from 'react-native';
import { render, screen } from '@testing-library/react-native';

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

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
  },
  useLocalSearchParams: () => ({
    recordId: mockRecordId,
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
  useHealthRecordDetailQuery: (
    puppyId: string | undefined,
    recordId: string | undefined,
  ) => mockUseHealthRecordDetailQuery(puppyId, recordId),
}));

describe('HealthRecordDetailRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockBack.mockClear();
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
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
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
    expect(screen.getByRole('button', {
      name: i18n.t('health.add-record.form-cancel'),
    })).toBeTruthy();
  });
});
