import { AccessibilityInfo, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { tokens } from '@/design/tokens';
import {
  HealthRecordDetailPreview,
  HealthRecordEditPreview,
  HealthScreen,
  HealthWeightEntryPreview,
} from '@/features/health/screens/HealthScreen';
import { i18n } from '@/lib/i18n';

describe('Health V2 anatomy', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('renders the V2 mixed list with noun status labels, metadata order, and no clinic filler', () => {
    render(<HealthScreen reviewState="mixed-list" />);

    expect(screen.getByText(i18n.t('health.rows.dhpp-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.weight-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.parasite-review-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.dhpp-template-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.vet-visit-title'))).toBeTruthy();
    expect(screen.getByLabelText([
      i18n.t('health.rows.parasite-review-title'),
      i18n.t('health.pills.needs-vet-review'),
      i18n.t('health.rows.parasite-review-meta'),
      i18n.t('health.rows.parasite-review-subline'),
    ].join('. '))).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('health.pills.needs-vet-review'))).toBeTruthy();
    expect(screen.queryByText(/No clinic listed|Sin clínica|Клиника не указана/i)).toBeNull();
    expect(screen.queryByText(/diagnosis|dose|urgent/i)).toBeNull();

    fireEvent.press(screen.getByRole('tab', { name: i18n.t('health.segments.1') }));

    expect(screen.getByText(i18n.t('health.rows.dhpp-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.dhpp-template-title'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('health.rows.weight-title'))).toBeNull();
    expect(screen.queryByText(i18n.t('health.rows.parasite-review-title'))).toBeNull();
  });

  it('renders detail status as a noun and exposes exactly one active stage', () => {
    render(<HealthRecordDetailPreview status="needsVetReview" />);

    expect(screen.getAllByText(i18n.t('health.pills.needs-vet-review')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('health.detail.status-label'))).toBeTruthy();
    expect(screen.queryByText(/Ask your vet/i)).toBeNull();
    expect(screen.getByLabelText(i18n.t('health.status-transitions.a11y-template', {
      current: 2,
      currentLabel: i18n.t('health.status-transitions.stages.1'),
    }))).toBeTruthy();

    const activeSegments = screen.getAllByTestId('health-stage-segment', {
      includeHiddenElements: true,
    }).filter((segment) => {
      const style = StyleSheet.flatten(segment.props.style);

      return style.backgroundColor === tokens.color.primary[600];
    });

    expect(activeSegments).toHaveLength(1);
  });

  it('keeps delete as the only danger-filled Health action with confirm and busy states', () => {
    render(<HealthRecordDetailPreview deletePending />);

    const deleteAction = screen.getByRole('button', {
      name: i18n.t('health.edit-record.delete-action'),
    });
    const confirmDelete = screen.getByRole('button', {
      name: i18n.t('health.edit-record.delete-confirm.destructive'),
    });

    expect(deleteAction.props.accessibilityState.busy).toBe(true);
    expect(screen.getByLabelText(i18n.t('health.edit-record.delete-confirm.title'))).toBeTruthy();
    expect(confirmDelete.props.accessibilityState.disabled).toBe(true);
  });

  it('renders edit and weight entry paths without raw medical advice copy', () => {
    render(
      <>
        <HealthRecordEditPreview />
        <HealthRecordEditPreview filled />
        <HealthWeightEntryPreview />
      </>,
    );

    expect(screen.getAllByText(i18n.t('health.add-record.sheet-title')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('health.add-record.note-hint')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('health.add-record.urgent-toggle')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('health.weight-entry.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.weight-entry.value'))).toBeTruthy();
    expect(screen.queryByText(/diagnosis|dosage|treatment plan|emergency/i)).toBeNull();
  });
});
