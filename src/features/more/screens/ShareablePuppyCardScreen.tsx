import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppIcon,
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
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type ShareablePuppyCardScreenProps = Readonly<{
  onBack?: () => void;
  onShare?: () => void;
  puppyName?: string;
}>;

const SHAREABLE_CARD_PREVIEW_ASPECT_RATIO = 3 / 4;

const builderFieldKeys = [
  'sharing.card-builder.fields.0',
  'sharing.card-builder.fields.2',
  'sharing.card-builder.fields.6',
] as const;

export function ShareablePuppyCardScreen({
  onBack,
  onShare,
  puppyName,
}: ShareablePuppyCardScreenProps) {
  const { t } = useAppTranslation();
  const resolvedPuppyName = puppyName ?? t('sharing.card-management.sample-puppy-name');
  const activeDate = t('sharing.card-management.sample-active-date');

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
});
