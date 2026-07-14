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

  it('AC-PET-HUB renders a Pet profile hub before the lightweight Health block', () => {
    const openPuppyProfile = jest.fn();
    const openQuickTrackers = jest.fn();

    render(
      <HealthScreen
        onOpenPuppyProfile={openPuppyProfile}
        onOpenQuickTrackers={openQuickTrackers}
        reviewState="mixed-list"
      />,
    );

    const screenTitle = screen.getByRole('header', { name: i18n.t('tabs.pet') });
    const screenTitleStyle = StyleSheet.flatten(screenTitle.props.style);
    const hub = screen.getByTestId('pet-profile-hub-card');
    const hubStyle = StyleSheet.flatten(hub.props.style);

    expect(screenTitleStyle.fontSize).toBe(tokens.typography.scale.title1.fontSize);
    expect(hub).toBeTruthy();
    expect(hubStyle.backgroundColor).toBe(tokens.color.surface.raised);
    expect(screen.getByTestId('pet-profile-hub-avatar')).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-summary.no-age'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('more.puppy-profile.missing-value')).length).toBeGreaterThanOrEqual(2);
    const editProfile = screen.getByRole('button', { name: i18n.t('health.pet-hub.edit-profile') });
    expect(editProfile).toBeTruthy();
    expect(screen.queryByRole('button', { name: i18n.t('health.pet-hub.add-weight') })).toBeNull();
    const trackersEntry = screen.getByRole('button', {
      name: i18n.t('health.pet-hub.quick-trackers-a11y'),
    });

    fireEvent.press(editProfile);
    expect(trackersEntry).toBeTruthy();
    fireEvent.press(trackersEntry);
    expect(openPuppyProfile).toHaveBeenCalledTimes(1);
    expect(openQuickTrackers).toHaveBeenCalledTimes(1);
    expect(screen.getByText(i18n.t('health.rows.dhpp-title'))).toBeTruthy();
    expect(screen.queryByText(/chart/i)).toBeNull();
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

  it('AC-PET-VET-PREP renders the vet visit prep reference card inside Pet Health', () => {
    const checklistKeys = [
      'health.vet-prep.checklist.0',
      'health.vet-prep.checklist.1',
      'health.vet-prep.checklist.2',
      'health.vet-prep.checklist.3',
    ] as const;

    render(<HealthScreen reviewState="mixed-list" />);

    const prepCard = screen.getByTestId('health-vet-prep-card');
    const prepCardStyle = StyleSheet.flatten(prepCard.props.style);
    const rows = screen.getAllByTestId('health-vet-prep-checklist-row');

    expect(prepCard).toBeTruthy();
    expect(prepCardStyle.backgroundColor).toBe(tokens.color.surface.raised);
    expect(screen.getByText(i18n.t('health.vet-prep.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.vet-prep.subtitle', {
      date: i18n.t('health.vet-prep.sample-date'),
      time: i18n.t('health.vet-prep.sample-time'),
    }))).toBeTruthy();
    expect(rows).toHaveLength(4);
    for (const [index, row] of rows.entries()) {
      const rowStyle = StyleSheet.flatten(row.props.style);

      expect(rowStyle.minHeight).toBeGreaterThanOrEqual(36);
      expect(screen.getByText(i18n.t(checklistKeys[index]))).toBeTruthy();
    }
    expect(screen.getByRole('button', {
      name: i18n.t('health.vet-prep.add-item'),
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('health.vet-prep.hint'))).toBeTruthy();
    expect(screen.queryByText(/diagnosis|dosage|treatment plan|emergency/i)).toBeNull();
  });

  it('AC-PET-VET-PREP-LOCAL toggles vet prep checklist completion locally', () => {
    render(<HealthScreen reviewState="mixed-list" />);

    const firstChecklistToggle = screen.getByRole('checkbox', {
      name: i18n.t('health.vet-prep.checklist.0'),
    });
    const secondChecklistToggle = screen.getByRole('checkbox', {
      name: i18n.t('health.vet-prep.checklist.1'),
    });

    expect(firstChecklistToggle.props.accessibilityState.checked).toBe(false);
    expect(secondChecklistToggle.props.accessibilityState.checked).toBe(false);

    fireEvent.press(firstChecklistToggle);

    expect(screen.getByRole('checkbox', {
      name: i18n.t('health.vet-prep.checklist.0'),
    }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole('checkbox', {
      name: i18n.t('health.vet-prep.checklist.1'),
    }).props.accessibilityState.checked).toBe(false);

    fireEvent.press(screen.getByRole('checkbox', {
      name: i18n.t('health.vet-prep.checklist.0'),
    }));

    expect(screen.getByRole('checkbox', {
      name: i18n.t('health.vet-prep.checklist.0'),
    }).props.accessibilityState.checked).toBe(false);
  });

  it('AC-PET-STATES-1 AC-PET-STATES-2 renders main Health loading, error, and offline-read state cards', () => {
    render(
      <>
        <HealthScreen reviewState="loading" />
        <HealthScreen reviewState="error" />
        <HealthScreen reviewState="offline-read" />
      </>,
    );

    for (const state of ['loading', 'error', 'offline-read'] as const) {
      expect(screen.getByTestId(`health-main-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`health.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`health.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('health-main-state-loading').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getByTestId('health-main-state-error').props.accessibilityRole)
      .toBe('alert');
    expect(i18n.t('health.states.offline-read.body')).toMatch(/last saved/i);
    expect(screen.getAllByTestId('pet-profile-hub-card')).toHaveLength(3);
    expect(screen.queryByText(i18n.t('health.empty.title'))).toBeNull();
  });

  it('AC-PET-ADD opens the health record add flow from the empty Pet health state', () => {
    const openAddRecord = jest.fn();

    render(<HealthScreen onOpenAddRecord={openAddRecord} />);

    const addRecord = screen.getByRole('button', {
      name: i18n.t('health.empty.primary'),
    });

    expect(addRecord.props.accessibilityState.disabled).toBe(false);
    fireEvent.press(addRecord);
    expect(openAddRecord).toHaveBeenCalledTimes(1);
  });

  it('renders detail status as a noun and exposes exactly one active stage', () => {
    render(<HealthRecordDetailPreview status="needsVetReview" />);

    expect(screen.getAllByText(i18n.t('health.pills.needs-vet-review')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('health.detail.status-label'))).toBeTruthy();
    expect(screen.queryByText(/Ask your vet/i)).toBeNull();
    expect(screen.getAllByTestId('health-stage-step')).toHaveLength(4);
    for (const stage of [
      i18n.t('health.status-transitions.stages.0'),
      i18n.t('health.status-transitions.stages.1'),
      i18n.t('health.status-transitions.stages.2'),
      i18n.t('health.status-transitions.stages.3'),
    ]) {
      expect(screen.getAllByText(stage).length).toBeGreaterThan(0);
    }
    expect(screen.getByLabelText(i18n.t('health.status-transitions.a11y-template', {
      current: 2,
      currentLabel: i18n.t('health.status-transitions.stages.1'),
    }))).toBeTruthy();

    const activeSegments = screen.getAllByTestId('health-stage-step', {
      includeHiddenElements: true,
    }).filter((step) => {
      const style = StyleSheet.flatten(step.props.style);

      return style.backgroundColor === tokens.color.pill.needsVetReview.fill;
    });

    expect(activeSegments).toHaveLength(1);
  });

  it('keeps delete as the only danger-filled Health action with confirm and busy states', () => {
    render(<HealthRecordDetailPreview deletePending />);

    const confirmCard = screen.getByTestId('health-record-delete-confirm-card');
    const deleteAction = screen.getByRole('button', {
      name: i18n.t('health.edit-record.delete-action'),
    });
    const confirmDelete = screen.getByRole('button', {
      name: i18n.t('health.edit-record.delete-confirm.destructive'),
    });

    expect(confirmCard.props.accessible).toBe(false);
    expect(deleteAction.props.accessibilityState.busy).toBe(true);
    expect(screen.getByLabelText(i18n.t('health.edit-record.delete-confirm.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.edit-record.delete-undo-toast'))).toBeTruthy();
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
