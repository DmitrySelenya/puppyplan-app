import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stack,
  TextField,
  Toggle,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

import { SignOutButton } from '../components/SignOutButton';

export type PrivacyAccountScreenProps = Readonly<{
  onBack?: () => void;
}>;

export function PrivacyAccountScreen({ onBack }: PrivacyAccountScreenProps) {
  const { t } = useAppTranslation();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [errorReportsEnabled, setErrorReportsEnabled] = useState(true);
  const [exportNoticeVisible, setExportNoticeVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [deleteRequestVisible, setDeleteRequestVisible] = useState(false);
  const deleteConfirmWord = t('more.privacy.delete-sheet.confirm-input-word');
  const canRequestDelete = deleteConfirmValue === deleteConfirmWord;

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

      <PrivacySection title={t('more.privacy.section-consents')}>
        <ListRow
          leading={<AppIcon name="sliders" />}
          title={t('more.privacy.row-analytics')}
          trailing={(
            <Toggle
              accessibilityLabel={t('more.privacy.row-analytics')}
              onValueChange={setAnalyticsEnabled}
              testID="privacy-analytics-toggle"
              value={analyticsEnabled}
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
              onValueChange={setErrorReportsEnabled}
              testID="privacy-error-reports-toggle"
              value={errorReportsEnabled}
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
            setDeleteConfirmVisible(true);
          }}
          title={t('more.privacy.row-delete')}
          variant="settings"
        />
      </PrivacySection>
      <SignOutButton />

      {deleteConfirmVisible ? (
        <Card
          accessibilityLabel={t('more.privacy.delete-sheet.title')}
          accessibilityRole="alert"
          style={styles.deleteCard}
          testID="privacy-delete-confirm">
          <Stack gap="md">
            <Stack gap="xs">
              <AppText variant="headline">{t('more.privacy.delete-sheet.title')}</AppText>
              <AppText tone="secondary" variant="body">
                {t('more.privacy.delete-sheet.body')}
              </AppText>
            </Stack>
            <TextField
              autoCapitalize="characters"
              label={t('more.privacy.delete-sheet.confirm-input-prompt')}
              onChangeText={setDeleteConfirmValue}
              placeholder={deleteConfirmWord}
              testID="privacy-delete-confirm-input"
              value={deleteConfirmValue}
            />
            <Button
              disabled={!canRequestDelete}
              label={t('more.privacy.row-delete')}
              onPress={() => {
                setDeleteRequestVisible(true);
                setDeleteConfirmVisible(false);
              }}
              testID="privacy-delete-confirm-action"
              variant="destructive"
            />
          </Stack>
        </Card>
      ) : null}

      {deleteRequestVisible ? (
        <Card
          accessibilityLiveRegion="polite"
          style={styles.noticeCard}
          testID="privacy-delete-requested"
          variant="mutedTemplate">
          <AppText tone="secondary" variant="subheadline">
            {t('more.privacy.delete-toast')}
          </AppText>
        </Card>
      ) : null}
    </Screen>
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
  deleteCard: {
    borderColor: tokens.color.status.danger,
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
