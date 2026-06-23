import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { EmptyState } from '@/design/primitives/EmptyState';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill, type StatusPillTone } from '@/design/primitives/StatusPill';
import { TextField } from '@/design/primitives/TextField';
import { Toggle } from '@/design/primitives/Toggle';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';

export type HealthScreenProps = Readonly<{
  reviewState?: 'empty' | 'mixed-list';
}>;

export function HealthScreen({
  reviewState = 'empty',
}: HealthScreenProps = {}) {
  const { t } = useAppTranslation();
  const [selectedSegment, setSelectedSegment] = useState<HealthSegment>('all');
  const rows = reviewState === 'mixed-list' ? healthReviewRows : [];
  const visibleRows = rows.filter((row) =>
    selectedSegment === 'all' || row.segment === selectedSegment);
  const currentRows = visibleRows.filter((row) => row.section === 'current');
  const previousRows = visibleRows.filter((row) => row.section === 'previous');
  // PUP-25 owns durable health records and the create/edit flow. Until then,
  // production Health stays honest-empty and the mixed rows require reviewState.
  const onAddHealthEntry = () => {};

  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="title">{t('tabs.health')}</AppText>
      <SegmentedControl
        accessibilityLabel={t('health.tab-title')}
        onValueChange={(value) => {
          setSelectedSegment(value as HealthSegment);
        }}
        options={[
          { label: t('health.segments.0'), value: 'all' },
          { label: t('health.segments.1'), value: 'vaccinations' },
          { label: t('health.segments.2'), value: 'treatments' },
          { label: t('health.segments.3'), value: 'visits' },
        ]}
        value={selectedSegment}
      />
      <Stack direction="horizontal" gap="sm" wrap>
        <StatusPill
          accessibilityLabel={t('health.filter-chips.0')}
          icon={<AppIcon name="docText" size={14} />}
          label={t('health.filter-chips.0')}
          tone="template"
        />
        <StatusPill
          accessibilityLabel={t('health.filter-chips.1')}
          icon={<AppIcon name="vaccine" size={14} />}
          label={t('health.filter-chips.1')}
          tone="confirmed"
        />
        <StatusPill
          accessibilityLabel={t('health.filter-chips.2')}
          icon={<AppIcon name="stethoscope" size={14} />}
          label={t('health.filter-chips.2')}
          tone="completed"
        />
      </Stack>
      {visibleRows.length > 0 ? (
        <Stack gap="md">
          <HealthRowsSection
            rows={currentRows}
            titleKey="health.rows.current-section"
          />
          <HealthRowsSection
            rows={previousRows}
            titleKey="health.rows.previous-section"
          />
        </Stack>
      ) : (
        <EmptyState
          body={t('health.empty.body')}
          icon={<AppIcon name="stethoscope" size={36} />}
          primaryAction={{
            disabled: true,
            label: t('health.empty.primary'),
            onPress: onAddHealthEntry,
          }}
          secondaryAction={{
            disabled: true,
            label: t('health.empty.secondary'),
            onPress: onAddHealthEntry,
          }}
          title={t('health.empty.title')}
        />
      )}
      <AppText tone="secondary" variant="footnote">{t('health.footer-hint')}</AppText>
    </Screen>
  );
}

type HealthSegment = 'all' | 'vaccinations' | 'treatments' | 'visits';
type HealthRow = Readonly<{
  icon: AppIconName;
  metaKey: I18nKey;
  pillIcon: AppIconName;
  pillKey: I18nKey;
  pillTone: StatusPillTone;
  section: 'current' | 'previous';
  segment: HealthSegment;
  subtitleKey?: I18nKey;
  titleKey: I18nKey;
}>;

function HealthRowsSection({
  rows,
  titleKey,
}: Readonly<{
  rows: readonly HealthRow[];
  titleKey: I18nKey;
}>) {
  const { t } = useAppTranslation();

  if (rows.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      <SectionHeader
        title={t(titleKey)}
        titleStyle={styles.sectionTitle}
      />
      <ListGroup>
        {rows.map((row) => (
          <ListRow
            accessory="chevron"
            accessibilityLabel={[
              t(row.titleKey),
              t(row.pillKey),
              t(row.metaKey),
              row.subtitleKey ? t(row.subtitleKey) : undefined,
            ].filter(Boolean).join('. ')}
            key={row.titleKey}
            leading={<AppIcon color={tokens.color.text.secondary} name={row.icon} />}
            meta={t(row.metaKey)}
            subtitle={row.subtitleKey ? t(row.subtitleKey) : undefined}
            title={t(row.titleKey)}
            trailing={(
              <Stack align="center" direction="horizontal" gap="sm">
                <StatusPill
                  accessibilityLabel={t(row.pillKey)}
                  icon={<AppIcon name={row.pillIcon} size={14} />}
                  label={t(row.pillKey)}
                  tone={row.pillTone}
                />
                <AppIcon
                  color={tokens.color.text.tertiary}
                  name="chevronRight"
                  size={18}
                />
              </Stack>
            )}
            variant="health"
          />
        ))}
      </ListGroup>
    </Stack>
  );
}

const healthReviewRows = [
  {
    icon: 'vaccine',
    metaKey: 'health.rows.dhpp-meta',
    pillIcon: 'vaccine',
    pillKey: 'health.pills.confirmed',
    pillTone: 'confirmed',
    section: 'current',
    segment: 'vaccinations',
    titleKey: 'health.rows.dhpp-title',
  },
  {
    icon: 'weight',
    metaKey: 'health.rows.weight-meta',
    pillIcon: 'weight',
    pillKey: 'health.pills.completed',
    pillTone: 'completed',
    section: 'current',
    segment: 'all',
    titleKey: 'health.rows.weight-title',
  },
  {
    icon: 'stethoscope',
    metaKey: 'health.rows.parasite-review-meta',
    pillIcon: 'stethoscope',
    pillKey: 'health.pills.needs-vet-review',
    pillTone: 'needsVetReview',
    section: 'current',
    segment: 'treatments',
    subtitleKey: 'health.rows.parasite-review-subline',
    titleKey: 'health.rows.parasite-review-title',
  },
  {
    icon: 'docText',
    metaKey: 'health.rows.dhpp-template-meta',
    pillIcon: 'docText',
    pillKey: 'health.pills.template',
    pillTone: 'template',
    section: 'current',
    segment: 'vaccinations',
    subtitleKey: 'health.template-row-subline',
    titleKey: 'health.rows.dhpp-template-title',
  },
  {
    icon: 'docText',
    metaKey: 'health.rows.vet-visit-meta',
    pillIcon: 'docText',
    pillKey: 'health.pills.completed',
    pillTone: 'completed',
    section: 'previous',
    segment: 'visits',
    titleKey: 'health.rows.vet-visit-title',
  },
] as const satisfies readonly HealthRow[];

type HealthRecordStatus = 'confirmed' | 'needsVetReview';

export function HealthRecordEditPreview({
  filled = false,
}: Readonly<{
  filled?: boolean;
}> = {}) {
  const { t } = useAppTranslation();

  return (
    <Card accessibilityLabel={t('health.add-record.sheet-title')}>
      <Stack gap="md">
        <Stack align="center" direction="horizontal" justify="space-between">
          <Button
            label={t('health.add-record.form-cancel')}
            onPress={() => undefined}
            variant="tertiary"
          />
          <AppText accessibilityRole="header" variant="headline">
            {t('health.add-record.sheet-title')}
          </AppText>
          <Button
            disabled={!filled}
            label={t('health.add-record.form-save')}
            onPress={() => undefined}
            variant="tertiary"
          />
        </Stack>
        <SectionHeader title={t('health.add-record.section-main')} />
        <TextField
          label={t('health.add-record.field-name')}
          onChangeText={() => undefined}
          placeholder={t('health.rows.dhpp-title')}
          value={filled ? t('health.rows.dhpp-title') : ''}
        />
        <ListRow
          meta={filled ? t('health.detail.date-value') : t('health.add-record.default-date')}
          title={t('health.add-record.field-date')}
        />
        <SegmentedControl
          accessibilityLabel={t('health.add-record.field-status')}
          onValueChange={() => undefined}
          options={[
            { label: t('health.add-record.status-segments.0'), value: 'template' },
            { label: t('health.add-record.status-segments.1'), value: 'confirmed' },
            { label: t('health.add-record.status-segments.2'), value: 'done' },
          ]}
          value={filled ? 'confirmed' : 'template'}
        />
        <SectionHeader title={t('health.add-record.section-extra')} />
        <TextField
          label={t('health.add-record.field-clinic')}
          onChangeText={() => undefined}
          value=""
        />
        <TextField
          label={t('health.add-record.field-note')}
          multiline
          onChangeText={() => undefined}
          placeholder={t('health.add-record.privacy-hint')}
          value=""
        />
        <AppText tone="tertiary" variant="footnote">{t('health.add-record.note-hint')}</AppText>
        <ListRow
          meta={t('health.add-record.urgent-off')}
          title={t('health.add-record.urgent-toggle')}
          trailing={<Toggle onValueChange={() => undefined} value={false} />}
        />
        <AppText tone="tertiary" variant="footnote">{t('health.add-record.urgent-hint')}</AppText>
      </Stack>
    </Card>
  );
}

export function HealthRecordDetailPreview({
  deletePending = false,
  status = 'confirmed',
}: Readonly<{
  deletePending?: boolean;
  status?: HealthRecordStatus;
}> = {}) {
  const { t } = useAppTranslation();
  const statusKey = healthDetailStatusKey[status];
  const statusTone = status === 'confirmed' ? 'confirmed' : 'needsVetReview';
  const statusIcon = status === 'confirmed' ? 'vaccine' : 'stethoscope';

  return (
    <Card accessibilityLabel={t('health.edit-record.screen-title')}>
      <Stack gap="md">
        <Stack direction="horizontal" gap="md">
          <View style={styles.detailIconFrame}>
            <AppIcon
              color={tokens.color.primary[700]}
              name={statusIcon}
              size={28}
            />
          </View>
          <Stack gap="xs" style={styles.detailTitleCopy}>
            <AppText variant="title2">{t('health.rows.dhpp-title')}</AppText>
            <AppText tone="tertiary" variant="callout">{t('health.detail.subtitle')}</AppText>
            <StatusPill
              accessibilityLabel={t(statusKey)}
              icon={<AppIcon name={statusIcon} size={14} />}
              label={t(statusKey)}
              tone={statusTone}
            />
          </Stack>
        </Stack>
        <SectionHeader title={t('health.edit-record.section-details')} />
        <Card variant="mutedTemplate">
          <Stack gap="sm">
            <DetailRow label={t('health.detail.date-label')} value={t('health.detail.date-value')} />
            <DetailRow label={t('health.detail.status-label')} value={t(statusKey)} />
            <DetailRow label={t('health.detail.clinic-label')} value={t('health.detail.clinic-value')} />
            <DetailRow
              label={t('health.detail.note-label')}
              value={t('health.detail.note-value')}
            />
          </Stack>
        </Card>
        <SectionHeader title={t('health.detail.stage-section')} />
        <Card variant="mutedTemplate">
          <HealthStageStrip current={status === 'confirmed' ? 2 : 1} />
        </Card>
        <SectionHeader title={t('health.edit-record.section-history')} />
        <Card variant="mutedTemplate">
          <AppText tone="secondary" variant="footnote">
            {t('health.edit-record.history-line', { date: t('health.detail.history-date') })}
          </AppText>
        </Card>
        <Button
          accessibilityHint={t('health.edit-record.delete-confirm.body')}
          label={t('health.edit-record.delete-action')}
          leading={<AppIcon color={tokens.color.text.onPrimary} name="trash" size={18} />}
          loading={deletePending}
          onPress={() => undefined}
          variant="destructive"
        />
        <Card
          accessibilityLabel={t('health.edit-record.delete-confirm.title')}
          accessibilityRole="alert"
          variant="mutedTemplate">
          <Stack gap="sm">
            <AppText variant="headline">{t('health.edit-record.delete-confirm.title')}</AppText>
            <AppText tone="secondary">{t('health.edit-record.delete-confirm.body')}</AppText>
            <Stack direction="horizontal" gap="sm" wrap>
              <Button
                label={t('health.edit-record.delete-confirm.cancel')}
                onPress={() => undefined}
                variant="tertiary"
              />
              <Button
                disabled={deletePending}
                label={t('health.edit-record.delete-confirm.destructive')}
                onPress={() => undefined}
                variant="destructive"
              />
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}

export function HealthWeightEntryPreview() {
  const { t } = useAppTranslation();

  return (
    <Card accessibilityLabel={t('health.weight-entry.title')}>
      <Stack gap="sm">
        <Stack align="center" direction="horizontal" gap="md">
          <AppIcon
            color={tokens.color.text.secondary}
            name="weight"
            size={28}
          />
          <Stack gap="xs" style={styles.detailTitleCopy}>
            <AppText variant="headline">{t('health.weight-entry.title')}</AppText>
            <AppText numeric tone="secondary">{t('health.weight-entry.value')}</AppText>
          </Stack>
          <StatusPill
            accessibilityLabel={t('health.pills.completed')}
            icon={<AppIcon name="weight" size={14} />}
            label={t('health.pills.completed')}
            tone="completed"
          />
        </Stack>
        <AppText tone="secondary">{t('health.weight-entry.body')}</AppText>
        <Button
          label={t('health.weight-entry.action')}
          onPress={() => undefined}
          variant="secondary"
        />
      </Stack>
    </Card>
  );
}

function DetailRow({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <Stack direction="horizontal" gap="md" justify="space-between">
      <AppText tone="tertiary" variant="footnote">{label}</AppText>
      <AppText style={styles.detailValue} variant="body">{value}</AppText>
    </Stack>
  );
}

function HealthStageStrip({
  current,
}: Readonly<{
  current: 0 | 1 | 2 | 3;
}>) {
  const { t } = useAppTranslation();
  const currentLabel = t(healthStageKeys[current]);
  const nextLabel = current < 3
    ? t(healthStageKeys[current + 1])
    : t('health.status-transitions.complete-label');

  return (
    <View
      accessibilityLabel={t('health.status-transitions.a11y-template', {
        current: current + 1,
        currentLabel,
      })}
      accessible
      style={styles.stageStrip}
      testID="health-stage-strip">
      <Stack direction="horizontal" gap="sm">
        {healthStageIndexes.map((stageIndex) => {
          const active = stageIndex === current;
          const past = stageIndex < current;

          return (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              key={stageIndex}
              style={[
                styles.stageSegment,
                active ? styles.stageSegmentActive : null,
                past ? styles.stageSegmentPast : null,
              ]}
              testID="health-stage-segment"
            />
          );
        })}
      </Stack>
      <AppText tone="secondary" variant="footnote">
        {t('health.status-transitions.now-template', {
          currentLabel,
          nextLabel,
        })}
      </AppText>
      <AppText tone="tertiary" variant="footnote">{t('health.status-transitions.hint')}</AppText>
    </View>
  );
}

const healthDetailStatusKey = {
  confirmed: 'health.pills.confirmed',
  needsVetReview: 'health.pills.needs-vet-review',
} as const satisfies Record<HealthRecordStatus, I18nKey>;

const healthStageIndexes = [0, 1, 2, 3] as const;
const healthStageKeys = [
  'health.status-transitions.stages.0',
  'health.status-transitions.stages.1',
  'health.status-transitions.stages.2',
  'health.status-transitions.stages.3',
] as const satisfies readonly I18nKey[];

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.bottomInsetFab,
  },
  detailIconFrame: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[50],
    borderRadius: tokens.radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  detailTitleCopy: {
    flex: 1,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  stageSegment: {
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.full,
    flex: 1,
    height: 6,
  },
  stageSegmentActive: {
    backgroundColor: tokens.color.primary[600],
  },
  stageSegmentPast: {
    backgroundColor: tokens.color.primary[200],
  },
  stageStrip: {
    gap: tokens.space[2],
  },
});
