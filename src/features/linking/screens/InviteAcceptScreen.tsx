import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  Screen,
  Stack,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type InviteAcceptScreenProps = Readonly<{
  inviteToken?: string;
  ownerName?: string;
  puppyName?: string;
}>;

const defaultOwnerName = 'Owner';
const defaultPuppyName = 'Puppy';

export function InviteAcceptScreen({
  ownerName = defaultOwnerName,
  puppyName = defaultPuppyName,
}: InviteAcceptScreenProps) {
  const { t } = useAppTranslation();
  const translationOptions = { ownerName, puppyName };

  return (
    <Screen contentStyle={styles.content}>
      <Stack gap="lg">
        <Stack gap="sm">
          <AppIcon color={tokens.color.primary[700]} filled name="personCluster" size={36} />
          <AppText variant="title">
            {t('sharing.family.accepted.header', translationOptions)}
          </AppText>
          <AppText tone="secondary" variant="headline">
            {t('sharing.family.accepted.role-caregiver')}
          </AppText>
        </Stack>

        <Card testID="invite-accept-preview-card">
          <Stack gap="md">
            <PreviewBlock
              icon="check"
              iconColor={tokens.color.primary[700]}
              title={t('sharing.family.accepted.what-included')}>
              <Bullet icon="check" iconColor={tokens.color.primary[700]}>
                {t('sharing.family.accepted.caregiver-included-bullets.0', { puppyName })}
              </Bullet>
              <Bullet icon="check" iconColor={tokens.color.primary[700]}>
                {t('sharing.family.accepted.caregiver-included-bullets.1')}
              </Bullet>
              <Bullet icon="check" iconColor={tokens.color.primary[700]}>
                {t('sharing.family.accepted.caregiver-included-bullets.2')}
              </Bullet>
            </PreviewBlock>

            <Stack style={styles.divider} />

            <PreviewBlock
              icon="lock"
              iconColor={tokens.color.text.tertiary}
              title={t('sharing.family.accepted.what-excluded')}>
              <Bullet icon="lock" iconColor={tokens.color.text.tertiary}>
                {t('sharing.family.accepted.caregiver-excluded-bullets.0')}
              </Bullet>
              <Bullet icon="lock" iconColor={tokens.color.text.tertiary}>
                {t('sharing.family.accepted.caregiver-excluded-bullets.1')}
              </Bullet>
            </PreviewBlock>
          </Stack>
        </Card>

        <Card style={styles.disclosureCard} variant="mutedTemplate">
          <AppText tone="secondary" variant="body">
            {t('sharing.family.accepted.disclosure', { ownerName })}
          </AppText>
        </Card>

        <Stack gap="sm">
          <Button
            label={t('sharing.family.accepted.accept')}
            onPress={() => undefined}
          />
          <Button
            label={t('sharing.family.accepted.decline')}
            onPress={() => undefined}
            variant="tertiary"
          />
        </Stack>
      </Stack>
    </Screen>
  );
}

function PreviewBlock({
  children,
  icon,
  iconColor,
  title,
}: Readonly<{
  children: ReactNode;
  icon: 'check' | 'lock';
  iconColor: string;
  title: string;
}>) {
  return (
    <Stack gap="sm">
      <Stack gap="sm" style={styles.previewTitleRow}>
        <AppIcon color={iconColor} name={icon} size={20} />
        <AppText variant="headline">{title}</AppText>
      </Stack>
      <Stack gap="xs">{children}</Stack>
    </Stack>
  );
}

function Bullet({
  children,
  icon,
  iconColor,
}: Readonly<{
  children: string;
  icon: 'check' | 'lock';
  iconColor: string;
}>) {
  return (
    <Stack gap="sm" style={styles.bulletRow}>
      <AppIcon color={iconColor} name={icon} size={16} />
      <AppText style={styles.bulletCopy} variant="body">
        {children}
      </AppText>
    </Stack>
  );
}

const styles = StyleSheet.create({
  bulletCopy: {
    flex: 1,
    minWidth: 0,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  disclosureCard: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: tokens.color.status.info,
  },
  divider: {
    backgroundColor: tokens.color.stroke.default,
    height: StyleSheet.hairlineWidth,
  },
  previewTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
