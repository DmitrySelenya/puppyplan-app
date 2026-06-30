import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
  AppText,
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

export type HelpSupportScreenProps = Readonly<{
  onBack?: () => void;
}>;

export function HelpSupportScreen({
  onBack,
}: HelpSupportScreenProps) {
  const { t } = useAppTranslation();

  return (
    <Screen contentStyle={styles.content}>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('more.help.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('more.help.screen-title')} />
      )}

      <Card accessibilityLabel={t('more.help.intro-title')} testID="more-help-intro-card">
        <Stack gap="sm">
          <AppIcon color={tokens.color.status.info} name="infoCircle" />
          <Stack gap="xs">
            <AppText variant="headline">{t('more.help.intro-title')}</AppText>
            <AppText tone="secondary" variant="body">
              {t('more.help.intro-body')}
            </AppText>
          </Stack>
        </Stack>
      </Card>

      <HelpSection title={t('more.help.sections.topics')}>
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="bowl" />}
          onPress={() => undefined}
          title={t('more.help.topic-quick-log')}
          variant="settings"
        />
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="personCluster" />}
          onPress={() => undefined}
          title={t('more.help.topic-sharing')}
          variant="settings"
        />
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="lock" />}
          onPress={() => undefined}
          title={t('more.help.topic-privacy')}
          variant="settings"
        />
      </HelpSection>

      <HelpSection title={t('more.help.sections.diagnostics')}>
        <ListRow
          leading={<AppIcon name="infoCircle" />}
          meta={t('more.about.version')}
          title={t('more.help.version-row')}
          variant="settings"
        />
        <ListRow
          leading={<AppIcon name="docText" />}
          meta={t('more.help.support-code-value')}
          title={t('more.help.support-code-row')}
          variant="settings"
        />
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="docText" />}
          onPress={() => undefined}
          subtitle={t('more.help.contact-hint')}
          title={t('more.help.contact-row')}
          variant="settings"
        />
      </HelpSection>

      <Card
        accessibilityLabel={t('more.help.privacy-note')}
        style={styles.privacyCard}
        testID="more-help-privacy-note"
        variant="mutedTemplate">
        <AppText tone="secondary" variant="footnote">
          {t('more.help.privacy-note')}
        </AppText>
      </Card>
    </Screen>
  );
}

function HelpSection({
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
  privacyCard: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: tokens.color.status.info,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
});
