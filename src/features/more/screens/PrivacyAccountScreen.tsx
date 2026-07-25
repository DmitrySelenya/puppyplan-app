import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  AppText,
  Card,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stack,
  StatusPill,
  type StatusPillTone,
  Toggle,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';

import { SignOutButton } from '../components/SignOutButton';

export type PrivacyAccountReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read'
  | 'permission-denied';

type PrivacyAccountStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const privacyAccountStateMeta: Record<PrivacyAccountReviewState, PrivacyAccountStateMeta> = {
  error: {
    bodyKey: 'more.privacy.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'more.privacy.states.error.status',
    titleKey: 'more.privacy.states.error.title',
    tone: 'failed',
  },
  loading: {
    bodyKey: 'more.privacy.states.loading.body',
    icon: 'lock',
    liveRegion: 'polite',
    statusKey: 'more.privacy.states.loading.status',
    titleKey: 'more.privacy.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'more.privacy.states.offline-read.body',
    icon: 'lock',
    statusKey: 'more.privacy.states.offline-read.status',
    titleKey: 'more.privacy.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'more.privacy.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'more.privacy.states.pending-write.status',
    titleKey: 'more.privacy.states.pending-write.title',
    tone: 'pending',
  },
  'permission-denied': {
    bodyKey: 'more.privacy.states.permission-denied.body',
    icon: 'lock',
    role: 'alert',
    statusKey: 'more.privacy.states.permission-denied.status',
    titleKey: 'more.privacy.states.permission-denied.title',
    tone: 'failed',
  },
};

export type PrivacyAccountScreenProps = Readonly<{
  onBack?: () => void;
  reviewState?: PrivacyAccountReviewState;
}>;

export function PrivacyAccountScreen({
  onBack,
  reviewState,
}: PrivacyAccountScreenProps) {
  const { t } = useAppTranslation();
  const [exportNoticeVisible, setExportNoticeVisible] = useState(false);
  const [deleteUnavailableVisible, setDeleteUnavailableVisible] = useState(false);

  return (
    <Screen contentStyle={styles.content}>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('more.privacy.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('more.privacy.screen-title')} />
      )}

      {reviewState ? <PrivacyAccountStatePreview state={reviewState} /> : null}

      <PrivacySection title={t('more.privacy.section-consents')}>
        <ListRow
          leading={<AppIcon name="sliders" />}
          title={t('more.privacy.row-analytics')}
          trailing={(
            <Toggle
              accessibilityLabel={t('more.privacy.row-analytics')}
              disabled
              onValueChange={() => undefined}
              testID="privacy-analytics-toggle"
              value={false}
            />
          )}
          variant="settings"
        />
      </PrivacySection>
      <AppText
        style={styles.hint}
        tone="secondary"
        variant="footnote">
        {t('more.privacy.analytics-hint')}
      </AppText>

      <PrivacySection title={t('more.privacy.section-errors')}>
        <ListRow
          leading={<AppIcon name="warningTriangle" />}
          title={t('more.privacy.row-error-reports')}
          trailing={(
            <Toggle
              accessibilityLabel={t('more.privacy.row-error-reports')}
              disabled
              onValueChange={() => undefined}
              testID="privacy-error-reports-toggle"
              value={false}
            />
          )}
          variant="settings"
        />
      </PrivacySection>
      <AppText
        style={styles.hint}
        tone="secondary"
        variant="footnote">
        {t('more.privacy.errors-hint')}
      </AppText>
      <Card variant="mutedTemplate">
        <AppText tone="secondary" variant="footnote">
          {t('more.privacy.consents-unavailable')}
        </AppText>
      </Card>

      <PrivacySection title={t('more.privacy.section-your-data')}>
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="docText" />}
          onPress={() => {
            setExportNoticeVisible(true);
          }}
          title={t('more.privacy.row-export')}
          variant="settings"
        />
      </PrivacySection>

      {exportNoticeVisible ? (
        <Card
          accessibilityLiveRegion="polite"
          style={styles.noticeCard}
          testID="privacy-export-notice"
          variant="mutedTemplate">
          <Stack gap="sm">
            <AppIcon color={tokens.color.status.info} name="docText" />
            <AppText tone="secondary" variant="subheadline">
              {t('more.privacy.export-sheet')}
            </AppText>
          </Stack>
        </Card>
      ) : null}

      <PrivacySection title={t('more.privacy.section-account')}>
        <ListRow
          accessory="chevron"
          leading={<AppIcon color={tokens.color.status.danger} name="trash" />}
          onPress={() => {
            setDeleteUnavailableVisible(true);
          }}
          title={t('more.privacy.row-delete')}
          variant="settings"
        />
      </PrivacySection>
      <SignOutButton />

      {deleteUnavailableVisible ? (
        <Card
          accessibilityLabel={[
            t('more.privacy.delete-sheet.title'),
            t('more.privacy.delete-sheet.body'),
          ].join('. ')}
          accessibilityLiveRegion="polite"
          style={styles.noticeCard}
          testID="privacy-delete-unavailable"
          variant="mutedTemplate">
          <Stack gap="xs">
            <AppText variant="headline">{t('more.privacy.delete-sheet.title')}</AppText>
            <AppText tone="secondary" variant="body">
              {t('more.privacy.delete-sheet.body')}
            </AppText>
          </Stack>
        </Card>
      ) : null}
    </Screen>
  );
}

export function PrivacyAccountStatePreview({
  state,
}: Readonly<{
  state: PrivacyAccountReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = privacyAccountStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`privacy-account-state-${state}`}
      variant={state === 'offline-read' ? 'mutedTemplate' : 'resting'}>
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

function PrivacySection({
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

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.space[6],
  },
  hint: {
    marginTop: -tokens.space[1],
    paddingHorizontal: tokens.layout.cardPadding,
  },
  noticeCard: {
    borderColor: tokens.color.stroke.default,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
});
