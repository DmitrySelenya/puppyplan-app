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
  StatusPill,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type SitterModeScreenProps = Readonly<{
  onBack?: () => void;
}>;

const checklistKeys = [
  'sharing.sitter.checklist-feeding',
  'sharing.sitter.checklist-walks',
  'sharing.sitter.checklist-potty',
  'sharing.sitter.checklist-meds',
  'sharing.sitter.checklist-training',
] as const;

export function SitterModeScreen({
  onBack,
}: SitterModeScreenProps) {
  const { t } = useAppTranslation();
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

      <Button
        label={t('sharing.sitter.enable-cta')}
        onPress={() => undefined}
      />
    </Screen>
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
