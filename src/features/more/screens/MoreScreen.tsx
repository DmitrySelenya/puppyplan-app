import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import type { PuppyProfile } from '@/contracts/supabase';
import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Avatar } from '@/design/primitives/Avatar';
import { Card } from '@/design/primitives/Card';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { ScreenHeader } from '@/design/primitives/ScreenHeader';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { Stack } from '@/design/primitives/Stack';
import { tokens } from '@/design/tokens';
import { type AppTranslate, type SupportedLocale, useAppTranslation } from '@/lib/i18n';
import { formatCalendarDate } from '@/lib/i18n/format-date';
import { useActiveCareContext } from '@/lib/query/active-care-context';

import { SignOutButton } from '../components/SignOutButton';

type PuppySettingsAccessState = 'loading' | 'owner' | 'nonOwner' | 'empty' | 'error';

export type MoreScreenProps = Readonly<{
  canManagePuppySettings?: boolean;
  openHousehold?: () => void;
  openHelp?: () => void;
  openNotifications?: () => void;
  openPetSettings?: () => void;
  openPlus?: () => void;
  openShareableCards?: () => void;
  openSitterMode?: () => void;
  openTimeline: () => void;
  puppy?: PuppyProfile | null;
  puppySettingsState?: PuppySettingsAccessState;
}>;

export function ConnectedMoreScreen(props: Omit<MoreScreenProps, 'canManagePuppySettings' | 'puppySettingsState'>) {
  const activeCare = useActiveCareContext();

  return (
    <MoreScreen
      {...props}
      puppy={activeCare.puppy}
      puppySettingsState={getPuppySettingsAccessState(activeCare)}
    />
  );
}

export function MoreScreen({
  canManagePuppySettings = true,
  openHousehold,
  openHelp,
  openNotifications,
  openPetSettings,
  openPlus,
  openShareableCards,
  openSitterMode,
  openTimeline,
  puppy = null,
  puppySettingsState,
}: MoreScreenProps) {
  const { locale, t } = useAppTranslation();
  const settingsState = puppySettingsState ?? (canManagePuppySettings ? 'owner' : 'nonOwner');

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title={t('more.screen-title')} />
      {puppy ? (
        <PuppySummaryCard
          locale={locale}
          onPress={openPetSettings}
          puppy={puppy}
          t={t}
        />
      ) : null}
      <PuppySettingsSection
        openPetSettings={openPetSettings}
        state={settingsState}
      />
      <SettingsSection title={t('more.sections.sharing')}>
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="personCluster" />}
          onPress={openHousehold}
          title={t('more.rows.family')}
          variant="settings"
        />
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="personCluster" />}
          onPress={openSitterMode}
          title={t('more.rows.trainer-sitter')}
          variant="settings"
        />
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="docText" />}
          onPress={openShareableCards}
          title={t('more.rows.shareable-cards')}
          variant="settings"
        />
      </SettingsSection>
      <SettingsSection title={t('more.sections.records')}>
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="docText" />}
          onPress={openTimeline}
          title={t('more.rows.timeline')}
          variant="settings"
        />
        <DeferredListRow icon="bell" title={t('more.rows.reminders')} />
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="gear" />}
          onPress={openNotifications}
          subtitle={t('more.notifications.push-hint')}
          title={t('more.rows.notifications')}
          variant="settings"
        />
      </SettingsSection>
      <SettingsSection title={t('more.sections.privacy')}>
        <DeferredListRow
          icon="lock"
          subtitle={t('more.privacy.section-account-removal')}
          title={t('more.rows.data-account')}
        />
      </SettingsSection>
      <SettingsSection title={t('more.sections.support')}>
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="infoCircle" />}
          onPress={openHelp}
          title={t('more.rows.help')}
          variant="settings"
        />
        <DeferredListRow
          icon="infoCircle"
          subtitle={t('more.about.version')}
          title={t('more.rows.about')}
        />
      </SettingsSection>
      <ListGroup>
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="paw" />}
          onPress={openPlus}
          subtitle={t('more.plus.subtitle')}
          title={t('more.rows.puppyplan-plus')}
          variant="settings"
        />
      </ListGroup>
      <SignOutButton />
    </Screen>
  );
}

function PuppySummaryCard({
  locale,
  onPress,
  puppy,
  t,
}: Readonly<{
  locale: SupportedLocale;
  onPress?: () => void;
  puppy: PuppyProfile;
  t: AppTranslate;
}>) {
  const content = (
    <>
      <Avatar label={puppy.name} size="xl" tone="accent" />
      <Stack gap="xs" style={styles.summaryText}>
        <AppText variant="headline">{puppy.name}</AppText>
        <AppText tone="secondary" variant="subheadline">
          {formatPuppySummary(puppy, t, locale)}
        </AppText>
      </Stack>
      {onPress ? <AppIcon color={tokens.color.text.tertiary} name="chevronRight" /> : null}
    </>
  );

  if (onPress) {
    return (
      <Card
        accessibilityLabel={puppy.name}
        onPress={onPress}
        style={styles.summaryCard}>
        {content}
      </Card>
    );
  }

  return <Card style={styles.summaryCard}>{content}</Card>;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  summaryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
});

function PuppySettingsSection({
  openPetSettings,
  state,
}: Readonly<{
  openPetSettings?: () => void;
  state: PuppySettingsAccessState;
}>) {
  const { t } = useAppTranslation();

  if (state === 'nonOwner' || state === 'empty') {
    return null;
  }

  return (
    <SettingsSection title={t('more.sections.puppy')}>
      {state === 'loading' ? (
        <Card>
          <AppText>{t('common.loading')}</AppText>
        </Card>
      ) : null}
      {state === 'error' ? (
        <Card
          accessibilityLabel={t('errors.load-failed')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <AppText>{t('errors.load-failed')}</AppText>
        </Card>
      ) : null}
      {state === 'owner' ? (
        <ListRow
          accessory="chevron"
          leading={<AppIcon name="paw" />}
          onPress={openPetSettings}
          title={t('more.rows.pet-settings')}
          variant="settings"
        />
      ) : null}
    </SettingsSection>
  );
}

function SettingsSection({
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

function DeferredListRow({
  icon,
  subtitle,
  title,
}: Readonly<{
  icon: ComponentProps<typeof AppIcon>['name'];
  subtitle?: string;
  title: string;
}>) {
  const { t } = useAppTranslation();

  return (
    <ListRow
      accessory="chevron"
      disabled
      leading={<AppIcon name={icon} />}
      meta={t('more.rows.deferred')}
      subtitle={subtitle}
      title={title}
      variant="settings"
    />
  );
}

function formatPuppySummary(
  puppy: PuppyProfile,
  t: AppTranslate,
  locale: SupportedLocale,
): string {
  if (typeof puppy.age_weeks_estimate === 'number') {
    return t('more.puppy-summary.age-weeks', { count: puppy.age_weeks_estimate });
  }

  if (puppy.birth_date) {
    return formatCalendarDate(puppy.birth_date, locale);
  }

  return t('more.puppy-summary.no-age');
}

function getPuppySettingsAccessState(
  activeCare: ReturnType<typeof useActiveCareContext>,
): PuppySettingsAccessState {
  if (activeCare.status === 'loading') {
    return 'loading';
  }

  if (activeCare.status === 'error') {
    return 'error';
  }

  if (activeCare.status !== 'ready' || activeCare.careContext === null) {
    return 'empty';
  }

  return activeCare.careContext.householdRole === 'owner' ? 'owner' : 'nonOwner';
}
