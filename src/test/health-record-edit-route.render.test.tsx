import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';

import HealthRecordEditRoute from '../../app/(modals)/pet/health-record-edit';

const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
  },
}));

describe('HealthRecordEditRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
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
});
