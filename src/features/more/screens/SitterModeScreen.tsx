import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  AppText,
  Avatar,
  Button,
  Card,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stack,
  StatusPill,
  type StatusPillTone,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';

export type SitterModeReviewState =
  | 'no-caregiver'
  | 'pending'
  | 'active'
  | 'exit-confirm';

type SitterModeStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

export type SitterModeScreenProps = Readonly<{
  onBack?: () => void;
  reviewState?: SitterModeReviewState;
}>;

const sitterModeStateMeta: Record<SitterModeReviewState, SitterModeStateMeta> = {
  active: {
    bodyKey: 'sharing.sitter.states.active.body',
    icon: 'check',
    statusKey: 'sharing.sitter.states.active.status',
    titleKey: 'sharing.sitter.states.active.title',
    tone: 'confirmed',
  },
  'exit-confirm': {
    bodyKey: 'sharing.sitter.states.exit-confirm.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'sharing.sitter.states.exit-confirm.status',
    titleKey: 'sharing.sitter.states.exit-confirm.title',
    tone: 'failed',
  },
  'no-caregiver': {
    bodyKey: 'sharing.sitter.states.no-caregiver.body',
    icon: 'personCluster',
    statusKey: 'sharing.sitter.states.no-caregiver.status',
    titleKey: 'sharing.sitter.states.no-caregiver.title',
    tone: 'template',
  },
  pending: {
    bodyKey: 'sharing.sitter.states.pending.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'sharing.sitter.states.pending.status',
    titleKey: 'sharing.sitter.states.pending.title',
    tone: 'pending',
  },
};

const checklistKeys = [
  'sharing.sitter.checklist-feeding',
  'sharing.sitter.checklist-walks',
  'sharing.sitter.checklist-potty',
  'sharing.sitter.checklist-meds',
  'sharing.sitter.checklist-training',
] as const;

export function SitterModeScreen({
  onBack,
  reviewState,
}: SitterModeScreenProps) {
  const { t } = useAppTranslation();
  const [unavailableVisible, setUnavailableVisible] = useState(false);
  const caregiverName = t('sharing.family.manage.badge-caregiver');

  return (
    <Screen contentStyle={styles.content}>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('sharing.sitter.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('sharing.sitter.screen-title')} />
      )}

      {reviewState ? <SitterModeStatePreview state={reviewState} /> : null}

      <Card testID="sitter-mode-hero-card">
        <Stack gap="sm" style={styles.heroLayout}>
          <View style={styles.iconBubble}>
            <AppIcon color={tokens.color.primary[700]} name="personCluster" size={24} />
          </View>
          <Stack gap="xs" style={styles.heroCopy}>
            <AppText variant="headline">{t('sharing.sitter.subtitle')}</AppText>
            <AppText tone="secondary" variant="body">
              {t('sharing.sitter.subtitle-body', { name: caregiverName })}
            </AppText>
          </Stack>
        </Stack>
      </Card>

      <SitterSection title={t('sharing.sitter.section-who')}>
        <ListRow
          leading={<Avatar label={caregiverName} size="md" tone="auto" />}
          subtitle={t('sharing.common.disclosure-can-close')}
          title={caregiverName}
          trailing={(
            <StatusPill
              accessibilityLabel={t('sharing.family.manage.badge-caregiver')}
              icon={<AppIcon name="personCluster" size={14} />}
              label={t('sharing.family.manage.badge-caregiver')}
              tone="pending"
            />
          )}
          variant="settings"
        />
      </SitterSection>

      <SitterSection title={t('sharing.sitter.section-period')}>
        <ListRow
          leading={<AppIcon name="calendar" />}
          subtitle={t('sharing.sitter.period-start-example')}
          title={t('sharing.sitter.period-start')}
          variant="settings"
        />
        <ListRow
          leading={<AppIcon name="calendar" />}
          subtitle={t('sharing.sitter.period-end-example')}
          title={t('sharing.sitter.period-end')}
          variant="settings"
        />
      </SitterSection>

      <SitterSection title={t('sharing.sitter.section-checklist')}>
        {checklistKeys.map((key, index) => (
          <View
            key={key}
            style={styles.checklistRow}
            testID="sitter-mode-checklist-row">
            <View style={[
              styles.checkFrame,
              index < 3 ? styles.checkFrameSelected : null,
            ]}>
              {index < 3 ? (
                <AppIcon color={tokens.color.text.onPrimary} name="check" size={14} />
              ) : null}
            </View>
            <AppText style={styles.checklistCopy} variant="body">{t(key)}</AppText>
          </View>
        ))}
      </SitterSection>

      <Card>
        <Stack gap="sm">
          <SectionHeader title={t('sharing.sitter.section-what-sitter-sees')} />
          <VisibilityRow>{t('sharing.sitter.sitter-preview-bullets.0')}</VisibilityRow>
          <VisibilityRow>{t('sharing.sitter.sitter-preview-bullets.1')}</VisibilityRow>
          <VisibilityRow excluded>{t('sharing.sitter.sitter-excluded')}</VisibilityRow>
        </Stack>
      </Card>

      <AppText tone="secondary" variant="footnote">{t('sharing.sitter.disclosure')}</AppText>

      {unavailableVisible ? (
        <Card
          accessibilityLabel={[
            t('sharing.sitter.unavailable-title'),
            t('sharing.sitter.unavailable-body'),
          ].join('. ')}
          accessibilityLiveRegion="polite"
          testID="sitter-mode-unavailable"
          variant="mutedTemplate">
          <Stack gap="xs">
            <AppText variant="headline">{t('sharing.sitter.unavailable-title')}</AppText>
            <AppText tone="secondary" variant="body">
              {t('sharing.sitter.unavailable-body')}
            </AppText>
          </Stack>
        </Card>
      ) : null}

      <Button
        label={t('sharing.sitter.enable-cta')}
        onPress={() => setUnavailableVisible(true)}
      />
    </Screen>
  );
}

export function SitterModeStatePreview({
  state,
}: Readonly<{
  state: SitterModeReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = sitterModeStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`sitter-mode-state-${state}`}
      variant={state === 'no-caregiver' ? 'mutedTemplate' : 'resting'}>
      <Stack gap="sm">
        <StatusPill
          accessibilityLabel={status}
          icon={(
            <AppIcon
              color={tokens.color.text.secondary}
              name={meta.icon}
              size={14}
            />
          )}
          label={status}
          tone={meta.tone}
        />
        <AppText variant="bodyEmph">{title}</AppText>
        <AppText tone="secondary" variant="subheadline">{body}</AppText>
      </Stack>
    </Card>
  );
}

function SitterSection({
  children,
  title,
}: Readonly<{
  children: ReactNode;
  title: string;
}>) {
  return (
    <Stack gap="xs">
      <SectionHeader title={title} titleStyle={styles.sectionTitle} />
      <ListGroup>{children}</ListGroup>
    </Stack>
  );
}

function VisibilityRow({
  children,
  excluded = false,
}: Readonly<{
  children: string;
  excluded?: boolean;
}>) {
  return (
    <Stack align="center" direction="horizontal" gap="sm">
      <View style={excluded ? styles.excludedBullet : styles.includedBullet}>
        <AppIcon
          color={excluded ? tokens.color.text.tertiary : tokens.color.text.onPrimary}
          name={excluded ? 'lock' : 'check'}
          size={14}
        />
      </View>
      <AppText style={styles.visibilityCopy} tone={excluded ? 'secondary' : 'primary'} variant="body">
        {children}
      </AppText>
    </Stack>
  );
}

const styles = StyleSheet.create({
  checkFrame: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderColor: tokens.color.stroke.strong,
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: tokens.space[6],
    justifyContent: 'center',
    width: tokens.space[6],
  },
  checkFrameSelected: {
    backgroundColor: tokens.color.primary[600],
    borderColor: tokens.color.primary[600],
  },
  checklistCopy: {
    flex: 1,
    minWidth: 0,
  },
  checklistRow: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderBottomColor: tokens.color.stroke.dividerHairline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: tokens.space[3],
    minHeight: tokens.component.listItem.minHeight,
    paddingHorizontal: tokens.layout.cardPadding,
    paddingVertical: tokens.space[3],
  },
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  excludedBullet: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.full,
    height: tokens.space[6],
    justifyContent: 'center',
    width: tokens.space[6],
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroLayout: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[100],
    borderRadius: tokens.radius.full,
    height: tokens.space[10],
    justifyContent: 'center',
    width: tokens.space[10],
  },
  includedBullet: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.radius.full,
    height: tokens.space[6],
    justifyContent: 'center',
    width: tokens.space[6],
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  visibilityCopy: {
    flex: 1,
    minWidth: 0,
  },
});
