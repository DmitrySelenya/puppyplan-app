import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { StatusPill } from '@/design/primitives/StatusPill';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

type AccessUnavailableScreenProps = {
  onAcknowledge?: () => void;
};

const noop = () => undefined;

export function AccessUnavailableScreen({
  onAcknowledge = noop,
}: AccessUnavailableScreenProps) {
  const { t } = useAppTranslation();
  const status = t('states.revoked-or-expired.status');

  return (
    <Screen contentStyle={styles.screenContent}>
      <Card
        accessibilityLabel={t('states.revoked-or-expired.title')}
        accessibilityRole="summary"
        style={styles.hero}
        testID="access-unavailable-card"
        variant="hero">
        <View style={styles.iconFrame}>
          <AppIcon
            color={tokens.color.status.info}
            name="lock"
            size={tokens.space[8]}
          />
        </View>
        <StatusPill
          accessibilityLabel={status}
          icon={(
            <AppIcon
              color={tokens.color.pill.pending.text}
              name="lock"
              size={tokens.component.pill.icon}
            />
          )}
          label={status}
          tone="pending"
        />
        <View style={styles.copyStack}>
          <AppText
            accessibilityRole="header"
            style={styles.centerText}
            variant="title2">
            {t('states.revoked-or-expired.title')}
          </AppText>
          <AppText
            style={styles.centerText}
            tone="secondary"
            variant="callout">
            {t('states.revoked-or-expired.body-long')}
          </AppText>
        </View>
      </Card>

      <Card variant="mutedTemplate">
        <View style={styles.row}>
          <AppIcon
            color={tokens.color.text.secondary}
            name="infoCircle"
            size={tokens.icon.specs.size}
          />
          <View style={styles.rowCopy}>
            <AppText variant="headline">{t('states.revoked-or-expired.safety-label')}</AppText>
            <AppText tone="secondary" variant="callout">
              {t('states.revoked-or-expired.safety-body')}
            </AppText>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <AppIcon
            color={tokens.color.text.secondary}
            name="personCluster"
            size={tokens.icon.specs.size}
          />
          <View style={styles.rowCopy}>
            <AppText variant="headline">{t('states.revoked-or-expired.next-step-title')}</AppText>
            <AppText tone="secondary" variant="callout">
              {t('states.revoked-or-expired.next-step-body')}
            </AppText>
          </View>
        </View>
      </Card>

      <Button
        label={t('states.revoked-or-expired.action')}
        onPress={onAcknowledge}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: 'center',
  },
  copyStack: {
    alignItems: 'center',
    gap: tokens.space[2],
  },
  hero: {
    alignItems: 'center',
    gap: tokens.space[4],
  },
  iconFrame: {
    alignItems: 'center',
    backgroundColor: tokens.color.status.infoTint,
    borderRadius: tokens.radius.full,
    height: tokens.space[14],
    justifyContent: 'center',
    width: tokens.space[14],
  },
  row: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  rowCopy: {
    flex: 1,
    gap: tokens.space[1],
  },
  screenContent: {
    justifyContent: 'center',
    maxWidth: tokens.layout.maxContentWidth,
  },
});
