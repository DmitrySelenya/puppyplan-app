import type { ReactNode } from 'react';
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

export type ShareablePuppyCardReviewState =
  | 'empty-builder'
  | 'health-on'
  | 'share-options'
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read';

type ShareablePuppyCardStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

export type ShareablePuppyCardScreenProps = Readonly<{
  onBack?: () => void;
  onShare?: () => void;
  puppyName?: string;
  reviewState?: ShareablePuppyCardReviewState;
}>;

const SHAREABLE_CARD_PREVIEW_ASPECT_RATIO = 3 / 4;

const shareableCardStateMeta: Record<ShareablePuppyCardReviewState, ShareablePuppyCardStateMeta> = {
  'empty-builder': {
    bodyKey: 'sharing.card-management.states.empty-builder.body',
    icon: 'docText',
    statusKey: 'sharing.card-management.states.empty-builder.status',
    titleKey: 'sharing.card-management.states.empty-builder.title',
    tone: 'template',
  },
  error: {
    bodyKey: 'sharing.card-management.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'sharing.card-management.states.error.status',
    titleKey: 'sharing.card-management.states.error.title',
    tone: 'failed',
  },
  'health-on': {
    bodyKey: 'sharing.card-management.states.health-on.body',
    icon: 'warningTriangle',
    statusKey: 'sharing.card-management.states.health-on.status',
    titleKey: 'sharing.card-management.states.health-on.title',
    tone: 'pending',
  },
  loading: {
    bodyKey: 'sharing.card-management.states.loading.body',
    icon: 'calendar',
    liveRegion: 'polite',
    statusKey: 'sharing.card-management.states.loading.status',
    titleKey: 'sharing.card-management.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'sharing.card-management.states.offline-read.body',
    icon: 'lock',
    statusKey: 'sharing.card-management.states.offline-read.status',
    titleKey: 'sharing.card-management.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'sharing.card-management.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'sharing.card-management.states.pending-write.status',
    titleKey: 'sharing.card-management.states.pending-write.title',
    tone: 'pending',
  },
  'share-options': {
    bodyKey: 'sharing.card-management.states.share-options.body',
    icon: 'docText',
    statusKey: 'sharing.card-management.states.share-options.status',
    titleKey: 'sharing.card-management.states.share-options.title',
    tone: 'confirmed',
  },
};

const builderFieldKeys = [
  'sharing.card-builder.fields.0',
  'sharing.card-builder.fields.2',
  'sharing.card-builder.fields.6',
] as const;

export function ShareablePuppyCardScreen({
  onBack,
  onShare,
  puppyName,
  reviewState,
}: ShareablePuppyCardScreenProps) {
  const { t } = useAppTranslation();
  const resolvedPuppyName = puppyName ?? t('sharing.card-management.sample-puppy-name');
  const activeDate = t('sharing.card-management.sample-active-date');
  const isPendingWrite = reviewState === 'pending-write';

  return (
    <Screen contentStyle={styles.content}>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('sharing.card-management.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('sharing.card-management.screen-title')} />
      )}

      <Card variant="hero">
        <Stack gap="sm" style={styles.heroLayout}>
          <View style={styles.heroIcon}>
            <AppIcon color={tokens.color.primary[700]} name="docText" size={24} />
          </View>
          <Stack gap="xs" style={styles.heroCopy}>
            <AppText variant="headline">
              {t('sharing.card-builder.screen-title', { puppyName: resolvedPuppyName })}
            </AppText>
            <AppText tone="secondary" variant="body">
              {t('sharing.card-builder.footer-note')}
            </AppText>
          </Stack>
        </Stack>
      </Card>

      {reviewState ? <ShareablePuppyCardStatePreview state={reviewState} /> : null}

      <ShareableCardSection title={t('sharing.card-builder.section-title')}>
        {builderFieldKeys.map((key) => (
          <ListRow
            key={key}
            leading={<AppIcon color={tokens.color.primary[700]} name="check" />}
            title={t(key)}
            variant="settings"
          />
        ))}
      </ShareableCardSection>

      <Card>
        <Stack gap="sm">
          <Stack align="center" direction="horizontal" gap="sm">
            <View style={styles.disclosureIcon}>
              <AppIcon color={tokens.color.status.warning} name="warningTriangle" size={18} />
            </View>
            <AppText style={styles.disclosureCopy} tone="secondary" variant="body">
              {t('sharing.card-builder.health-disclosure')}
            </AppText>
          </Stack>
        </Stack>
      </Card>

      <ShareableCardPreview
        activeDate={activeDate}
        puppyName={resolvedPuppyName}
        recipient={t('sharing.card-management.sample-recipient')}
      />

      <Button
        label={t('sharing.card-preview.share')}
        leading={<AppIcon color={tokens.color.text.onPrimary} name="docText" size={18} />}
        loading={isPendingWrite}
        onPress={onShare ?? (() => undefined)}
      />

      <Card>
        <Stack gap="sm">
          <SectionHeader title={t('sharing.card-management.public-link-disclosure')} />
          <AppText tone="secondary" variant="body">
            {t('sharing.common.disclosure-can-close')}
          </AppText>
        </Stack>
      </Card>

      <ShareableCardSection title={t('sharing.card-management.section-active')}>
        <ListRow
          leading={<Avatar label={resolvedPuppyName} size="md" tone="accent" />}
          meta={t('sharing.card-management.row-status-active', { date: activeDate })}
          title={t('sharing.card-management.sample-recipient')}
          variant="settings"
        />
      </ShareableCardSection>
    </Screen>
  );
}

export function ShareablePuppyCardStatePreview({
  state,
}: Readonly<{
  state: ShareablePuppyCardReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = shareableCardStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`shareable-card-state-${state}`}
      variant={state === 'offline-read' || state === 'empty-builder' ? 'mutedTemplate' : 'resting'}>
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
        {state === 'empty-builder' ? (
          <Button
            disabled
            label={t('sharing.card-builder.preview-cta')}
            onPress={() => undefined}
            variant="secondary"
          />
        ) : null}
        {state === 'health-on' ? <ShareableCardHealthDisclosure /> : null}
        {state === 'share-options' ? <ShareableCardShareOptions /> : null}
      </Stack>
    </Card>
  );
}

function ShareableCardHealthDisclosure() {
  const { t } = useAppTranslation();

  return (
    <Stack align="center" direction="horizontal" gap="sm">
      <View style={styles.disclosureIcon}>
        <AppIcon color={tokens.color.status.warning} name="warningTriangle" size={18} />
      </View>
      <Stack gap="xs" style={styles.disclosureCopy}>
        <AppText variant="subheadline">{t('sharing.card-builder.fields.6')}</AppText>
        <AppText tone="secondary" variant="footnote">
          {t('sharing.card-builder.health-disclosure')}
        </AppText>
      </Stack>
    </Stack>
  );
}

function ShareableCardShareOptions() {
  const { t } = useAppTranslation();

  return (
    <Stack gap="sm">
      <ShareableCardShareOption
        body={t('sharing.card-share-options.option-link-body')}
        iconColor={tokens.color.primary[700]}
        title={t('sharing.card-share-options.option-link-title')}
      />
      <ShareableCardShareOption
        body={t('sharing.card-share-options.option-snapshot-body')}
        iconColor={tokens.color.text.secondary}
        title={t('sharing.card-share-options.option-snapshot-title')}
      />
    </Stack>
  );
}

function ShareableCardShareOption({
  body,
  iconColor,
  title,
}: Readonly<{
  body: string;
  iconColor: string;
  title: string;
}>) {
  return (
    <Stack align="center" direction="horizontal" gap="sm" style={styles.shareOptionRow}>
      <AppIcon color={iconColor} name="docText" size={20} />
      <Stack gap="xs" style={styles.shareOptionCopy}>
        <AppText variant="subheadline">{title}</AppText>
        <AppText tone="secondary" variant="footnote">{body}</AppText>
      </Stack>
    </Stack>
  );
}

function ShareableCardPreview({
  activeDate,
  puppyName,
  recipient,
}: Readonly<{
  activeDate: string;
  puppyName: string;
  recipient: string;
}>) {
  const { t } = useAppTranslation();
  const title = t('sharing.card-builder.screen-title', { puppyName });
  const footer = t('sharing.card-preview.footer');

  return (
    <Card
      accessibilityLabel={t('sharing.card-preview.a11y', { footer, title })}
      style={styles.previewCard}
      testID="shareable-card-preview">
      <Stack gap="md" style={styles.previewContent}>
        <Stack align="center" direction="horizontal" gap="sm">
          <Avatar label={puppyName} size="lg" tone="accent" />
          <Stack gap="xs" style={styles.previewHeading}>
            <AppText variant="title">{puppyName}</AppText>
            <AppText tone="secondary" variant="subheadline">
              {t('sharing.card-management.sample-breed-age')}
            </AppText>
          </Stack>
        </Stack>

        <Stack gap="xs">
          <AppText variant="headline">{t('sharing.card-builder.fields.6')}</AppText>
          <AppText tone="secondary" variant="body">
            {t('sharing.card-management.sample-vaccine-1')}
          </AppText>
          <AppText tone="secondary" variant="body">
            {t('sharing.card-management.sample-vaccine-2')}
          </AppText>
        </Stack>

        <View style={styles.previewFooter}>
          <AppText tone="secondary" variant="footnote">
            {activeDate}
          </AppText>
          <AppText tone="tertiary" variant="footnote">
            {recipient}
          </AppText>
          <AppText tone="tertiary" variant="footnote">
            {footer}
          </AppText>
        </View>
      </Stack>
    </Card>
  );
}

function ShareableCardSection({
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
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  disclosureCopy: {
    flex: 1,
    minWidth: 0,
  },
  disclosureIcon: {
    alignItems: 'center',
    backgroundColor: tokens.color.status.warningTint,
    borderRadius: tokens.radius.full,
    height: tokens.space[8],
    justifyContent: 'center',
    width: tokens.space[8],
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[100],
    borderRadius: tokens.radius.full,
    height: tokens.space[10],
    justifyContent: 'center',
    width: tokens.space[10],
  },
  heroLayout: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  previewCard: {
    aspectRatio: SHAREABLE_CARD_PREVIEW_ASPECT_RATIO,
    justifyContent: 'space-between',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewFooter: {
    gap: tokens.space[1],
  },
  previewHeading: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  shareOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  shareOptionRow: {
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: tokens.space[3],
  },
});
