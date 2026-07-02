import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Avatar } from '@/design/primitives/Avatar';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { EmptyState } from '@/design/primitives/EmptyState';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { ScreenHeader } from '@/design/primitives/ScreenHeader';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill, type StatusPillTone } from '@/design/primitives/StatusPill';
import { TextField } from '@/design/primitives/TextField';
import { Touchable } from '@/design/primitives/Touchable';
import { Toggle } from '@/design/primitives/Toggle';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';

export type HealthScreenProps = Readonly<{
  onOpenAddRecord?: () => void;
  onOpenPuppyProfile?: () => void;
  onOpenQuickTrackers?: () => void;
  reviewState?: 'empty' | 'mixed-list';
}>;

export function HealthScreen({
  onOpenAddRecord = () => undefined,
  onOpenPuppyProfile = () => undefined,
  onOpenQuickTrackers = () => undefined,
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
  const onAddHealthEntry = onOpenAddRecord;

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title={t('tabs.pet')} />
      <PetProfileHub
        onOpenPuppyProfile={onOpenPuppyProfile}
        onOpenQuickTrackers={onOpenQuickTrackers}
      />
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
          <HealthVetPrepCard />
        </Stack>
      ) : (
        <EmptyState
          body={t('health.empty.body')}
          icon={<AppIcon name="stethoscope" size={36} />}
          primaryAction={{
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

function HealthVetPrepCard() {
  const { t } = useAppTranslation();
  const subtitle = t('health.vet-prep.subtitle', {
    date: t('health.vet-prep.sample-date'),
    time: t('health.vet-prep.sample-time'),
  });

  return (
    <Card
      accessibilityLabel={[
        t('health.vet-prep.title'),
        subtitle,
        t('health.vet-prep.hint'),
      ].join('. ')}
      testID="health-vet-prep-card">
      <Stack gap="md">
        <Stack direction="horizontal" gap="md">
          <View style={styles.vetPrepIconFrame}>
            <AppIcon
              color={tokens.color.primary[700]}
              name="stethoscope"
              size={24}
            />
          </View>
          <Stack gap="xs" style={styles.detailTitleCopy}>
            <AppText variant="headline">{t('health.vet-prep.title')}</AppText>
            <AppText tone="secondary" variant="callout">{subtitle}</AppText>
          </Stack>
        </Stack>
        <Stack gap="xs">
          {healthVetPrepChecklistKeys.map((key) => (
            <View
              key={key}
              style={styles.vetPrepChecklistRow}
              testID="health-vet-prep-checklist-row">
              <View style={styles.vetPrepCheckbox} />
              <AppText style={styles.vetPrepChecklistCopy} variant="body">
                {t(key)}
              </AppText>
            </View>
          ))}
        </Stack>
        <Button
          label={t('health.vet-prep.add-item')}
          onPress={() => undefined}
          variant="tertiary"
        />
        <AppText tone="tertiary" variant="footnote">{t('health.vet-prep.hint')}</AppText>
      </Stack>
    </Card>
  );
}

function PetProfileHub({
  onOpenPuppyProfile,
  onOpenQuickTrackers,
}: Readonly<{
  onOpenPuppyProfile: () => void;
  onOpenQuickTrackers: () => void;
}>) {
  const { t } = useAppTranslation();
  const profileTitle = t('more.puppy-profile.screen-title');
  const ageValue = t('more.puppy-summary.no-age');
  const missingValue = t('more.puppy-profile.missing-value');

  return (
    <Card
      accessibilityLabel={t('health.pet-hub.a11y', {
        age: ageValue,
        breed: missingValue,
        title: profileTitle,
        weight: missingValue,
      })}
      testID="pet-profile-hub-card">
      <Stack gap="md">
        <Stack align="center" direction="horizontal" gap="md" wrap>
          <Avatar
            initials="PP"
            label={profileTitle}
            size="lg"
            testID="pet-profile-hub-avatar"
            tone="accent"
          />
          <Stack gap="xs" style={styles.petHubTitleCopy}>
            <AppText variant="title2">{profileTitle}</AppText>
          </Stack>
          <Button
            label={t('health.pet-hub.edit-profile')}
            onPress={onOpenPuppyProfile}
            variant="tertiary"
          />
        </Stack>

        <View style={styles.petHubFacts}>
          <PetHubFact
            icon="calendar"
            label={t('health.pet-hub.age-label')}
            value={ageValue}
          />
          <PetHubFact
            icon="paw"
            label={t('health.pet-hub.breed-label')}
            value={missingValue}
          />
          <PetHubFact
            icon="weight"
            label={t('health.pet-hub.weight-label')}
            value={missingValue}
          />
        </View>

        <Stack direction="horizontal" gap="sm" wrap>
          <Button
            label={t('health.pet-hub.add-weight')}
            leading={<AppIcon name="weight" size={18} />}
            onPress={() => undefined}
            variant="secondary"
          />
          <Touchable
            accessibilityLabel={t('health.pet-hub.quick-trackers-a11y')}
            accessibilityRole="button"
            onPress={onOpenQuickTrackers}
            pressedStyle={styles.petHubTrackerEntryPressed}
            style={styles.petHubTrackerEntry}
            testID="pet-profile-hub-trackers-entry">
            <AppIcon
              color={tokens.color.text.secondary}
              name="sliders"
              size={20}
            />
            <Stack gap="xs" style={styles.petHubTrackerCopy}>
              <AppText variant="headline">{t('health.pet-hub.quick-trackers-title')}</AppText>
              <AppText tone="secondary" variant="footnote">
                {t('health.pet-hub.quick-trackers-meta')}
              </AppText>
            </Stack>
            <AppIcon
              color={tokens.color.text.tertiary}
              name="chevronRight"
              size={18}
            />
          </Touchable>
        </Stack>
      </Stack>
    </Card>
  );
}

function PetHubFact({
  icon,
  label,
  value,
}: Readonly<{
  icon: AppIconName;
  label: string;
  value: string;
}>) {
  return (
    <View style={styles.petHubFact}>
      <AppIcon color={tokens.color.text.secondary} name={icon} size={16} />
      <Stack gap="xs" style={styles.petHubFactCopy}>
        <AppText tone="tertiary" variant="footnote">{label}</AppText>
        <AppText variant="body">{value}</AppText>
      </Stack>
    </View>
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

type HealthRecordType = 'vaccination' | 'deworming' | 'prophylaxis' | 'vet-visit';

const healthRecordTypeOptions = [
  {
    icon: 'vaccine',
    key: 'vaccination',
    labelKey: 'health.record-types.vaccination',
  },
  {
    icon: 'stethoscope',
    key: 'deworming',
    labelKey: 'health.record-types.deworming',
  },
  {
    icon: 'docText',
    key: 'prophylaxis',
    labelKey: 'health.record-types.prophylaxis',
  },
  {
    icon: 'stethoscope',
    key: 'vet-visit',
    labelKey: 'health.record-types.vet-visit',
  },
] as const satisfies readonly {
  icon: AppIconName;
  key: HealthRecordType;
  labelKey: I18nKey;
}[];

type HealthRecordStatus = 'confirmed' | 'needsVetReview';
type HealthRecordEditReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read'
  | 'permission-denied';

type HealthRecordEditStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const healthRecordEditStateMeta: Record<HealthRecordEditReviewState, HealthRecordEditStateMeta> = {
  loading: {
    bodyKey: 'health.add-record.states.loading.body',
    icon: 'spark',
    liveRegion: 'polite',
    statusKey: 'health.add-record.states.loading.status',
    titleKey: 'health.add-record.states.loading.title',
    tone: 'pending',
  },
  'pending-write': {
    bodyKey: 'health.add-record.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'health.add-record.states.pending-write.status',
    titleKey: 'health.add-record.states.pending-write.title',
    tone: 'pending',
  },
  error: {
    bodyKey: 'health.add-record.states.error.body',
    icon: 'infoCircle',
    role: 'alert',
    statusKey: 'health.add-record.states.error.status',
    titleKey: 'health.add-record.states.error.title',
    tone: 'failed',
  },
  'offline-read': {
    bodyKey: 'health.add-record.states.offline-read.body',
    icon: 'lock',
    statusKey: 'health.add-record.states.offline-read.status',
    titleKey: 'health.add-record.states.offline-read.title',
    tone: 'template',
  },
  'permission-denied': {
    bodyKey: 'health.add-record.states.permission-denied.body',
    icon: 'lock',
    role: 'alert',
    statusKey: 'health.add-record.states.permission-denied.status',
    titleKey: 'health.add-record.states.permission-denied.title',
    tone: 'failed',
  },
};

export function HealthRecordEditRouteScreen({
  onClose,
  reviewState,
}: Readonly<{
  onClose: () => void;
  reviewState?: HealthRecordEditReviewState;
}>) {
  const { t } = useAppTranslation();
  const [selectedType, setSelectedType] = useState<HealthRecordType | null>(null);

  if (selectedType) {
    return (
      <Screen contentStyle={styles.content}>
        <HealthRecordEditPreview reviewState={reviewState} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <Card accessibilityLabel={t('health.add-record.sheet-title')}>
        <Stack gap="md">
          <Stack align="center" direction="horizontal" justify="space-between">
            <AppText accessibilityRole="header" variant="headline">
              {t('health.add-record.sheet-title')}
            </AppText>
            <Button
              label={t('health.add-record.close')}
              onPress={onClose}
              variant="tertiary"
            />
          </Stack>
          {reviewState ? (
            <HealthRecordEditStateCard state={reviewState} />
          ) : null}
          <ListGroup>
            {healthRecordTypeOptions.map((option) => (
              <ListRow
                accessory="chevron"
                key={option.key}
                leading={(
                  <AppIcon
                    color={tokens.color.text.secondary}
                    name={option.icon}
                  />
                )}
                onPress={() => {
                  setSelectedType(option.key);
                }}
                title={t(option.labelKey)}
                variant="health"
              />
            ))}
          </ListGroup>
          <AppText tone="secondary" variant="footnote">
            {t('health.add-record.hint-after-list')}
          </AppText>
        </Stack>
      </Card>
    </Screen>
  );
}

export function HealthRecordEditPreview({
  filled = false,
  reviewState,
}: Readonly<{
  filled?: boolean;
  reviewState?: HealthRecordEditReviewState;
}> = {}) {
  const { t } = useAppTranslation();
  const isPendingWrite = reviewState === 'pending-write';

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
            disabled={!filled && !isPendingWrite}
            label={t('health.add-record.form-save')}
            loading={isPendingWrite}
            onPress={() => undefined}
            variant="tertiary"
          />
        </Stack>
        {reviewState ? (
          <HealthRecordEditStateCard state={reviewState} />
        ) : null}
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

function HealthRecordEditStateCard({
  state,
}: Readonly<{
  state: HealthRecordEditReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = healthRecordEditStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`health-add-record-state-${state}`}
      variant={meta.role ? 'resting' : 'mutedTemplate'}>
      <Stack gap="sm">
        <StatusPill
          accessibilityLabel={status}
          icon={<AppIcon name={meta.icon} size={14} />}
          label={status}
          tone={meta.tone}
        />
        <AppText variant="headline">{title}</AppText>
        <AppText tone="secondary" variant="callout">{body}</AppText>
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
        {deletePending ? (
          <Card accessibilityLiveRegion="polite" variant="mutedTemplate">
            <Stack align="center" direction="horizontal" gap="sm">
              <AppIcon
                color={tokens.color.status.warning}
                name="warningTriangle"
                size={18}
              />
              <AppText variant="callout">
                {t('health.edit-record.delete-undo-toast')}
              </AppText>
            </Stack>
          </Card>
        ) : null}
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
      <View style={styles.stageSteps}>
        {healthStageDefinitions.map((stage, stageIndex) => {
          const active = stageIndex === current;
          const past = stageIndex < current;
          const stageTone = tokens.color.pill[stage.tone];

          return (
            <View
              key={stageIndex}
              accessible={false}
              style={[
                styles.stageStep,
                past ? styles.stageSegmentPast : null,
                {
                  backgroundColor: active
                    ? stageTone.fill
                    : tokens.color.surface.raised,
                  borderColor: stageTone.fill,
                },
              ]}
              testID="health-stage-step">
              <View style={[
                styles.stageStepIconFrame,
                {
                  backgroundColor: active
                    ? tokens.color.surface.raised
                    : stageTone.fill,
                },
              ]}>
                <AppIcon
                  color={stageTone.text}
                  name={stage.icon}
                  size={15}
                />
              </View>
              <AppText
                style={[styles.stageStepLabel, { color: stageTone.text }]}
                variant="footnote">
                {t(stage.labelKey)}
              </AppText>
            </View>
          );
        })}
      </View>
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

const healthStageKeys = [
  'health.status-transitions.stages.0',
  'health.status-transitions.stages.1',
  'health.status-transitions.stages.2',
  'health.status-transitions.stages.3',
] as const satisfies readonly I18nKey[];
const healthVetPrepChecklistKeys = [
  'health.vet-prep.checklist.0',
  'health.vet-prep.checklist.1',
  'health.vet-prep.checklist.2',
  'health.vet-prep.checklist.3',
] as const satisfies readonly I18nKey[];
const healthStageDefinitions = [
  {
    icon: 'docText',
    labelKey: 'health.status-transitions.stages.0',
    tone: 'template',
  },
  {
    icon: 'stethoscope',
    labelKey: 'health.status-transitions.stages.1',
    tone: 'needsVetReview',
  },
  {
    icon: 'vaccine',
    labelKey: 'health.status-transitions.stages.2',
    tone: 'confirmed',
  },
  {
    icon: 'spark',
    labelKey: 'health.status-transitions.stages.3',
    tone: 'completed',
  },
] as const satisfies readonly {
  icon: AppIconName;
  labelKey: I18nKey;
  tone: StatusPillTone;
}[];

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
  petHubFact: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[2],
    minWidth: 136,
  },
  petHubFactCopy: {
    flex: 1,
  },
  petHubFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
  },
  petHubTitleCopy: {
    flex: 1,
    minWidth: 150,
  },
  petHubTrackerCopy: {
    flex: 1,
  },
  petHubTrackerEntry: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'row',
    gap: tokens.space[3],
    minHeight: 56,
    minWidth: 220,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  petHubTrackerEntryPressed: {
    backgroundColor: tokens.color.surface.base,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  stageStep: {
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: tokens.space[1],
    justifyContent: 'center',
    minHeight: 58,
    minWidth: 72,
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[2],
  },
  stageStepIconFrame: {
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  stageStepLabel: {
    textAlign: 'center',
  },
  stageSegmentPast: {
    opacity: 0.78,
  },
  stageStrip: {
    gap: tokens.space[2],
  },
  stageSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  vetPrepCheckbox: {
    borderColor: tokens.color.stroke.strong,
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: 18,
    width: 18,
  },
  vetPrepChecklistCopy: {
    flex: 1,
  },
  vetPrepChecklistRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[3],
    minHeight: 36,
  },
  vetPrepIconFrame: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[50],
    borderRadius: tokens.radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
