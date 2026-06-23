import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { EmptyState } from '@/design/primitives/EmptyState';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill, type StatusPillTone } from '@/design/primitives/StatusPill';
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
  pillKey: I18nKey;
  pillTone: StatusPillTone;
  section: 'current' | 'previous';
  segment: Exclude<HealthSegment, 'all'>;
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
            key={row.titleKey}
            leading={<AppIcon color={tokens.color.text.secondary} name={row.icon} />}
            meta={t(row.metaKey)}
            subtitle={row.subtitleKey ? t(row.subtitleKey) : undefined}
            title={t(row.titleKey)}
            trailing={(
              <Stack align="center" direction="horizontal" gap="sm">
                <StatusPill
                  accessibilityLabel={t(row.pillKey)}
                  icon={<AppIcon name={row.icon} size={14} />}
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
    pillKey: 'health.pills.template',
    pillTone: 'template',
    section: 'current',
    segment: 'vaccinations',
    subtitleKey: 'health.template-row-subline',
    titleKey: 'health.rows.dhpp-title',
  },
  {
    icon: 'stethoscope',
    metaKey: 'health.rows.deworming-meta',
    pillKey: 'health.pills.confirmed',
    pillTone: 'confirmed',
    section: 'current',
    segment: 'treatments',
    titleKey: 'health.rows.deworming-title',
  },
  {
    icon: 'docText',
    metaKey: 'health.rows.vet-visit-meta',
    pillKey: 'health.pills.completed',
    pillTone: 'completed',
    section: 'previous',
    segment: 'visits',
    titleKey: 'health.rows.vet-visit-title',
  },
] as const satisfies readonly HealthRow[];

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.bottomInsetFab,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
});
