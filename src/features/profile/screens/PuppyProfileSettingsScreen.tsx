import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  puppyProfileInputSchema,
  type PuppyAgeMode,
  type PuppyProfileInput,
} from '@/contracts/onboarding';
import type { PuppyProfile } from '@/contracts/supabase';
import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Avatar } from '@/design/primitives/Avatar';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { ScreenHeader } from '@/design/primitives/ScreenHeader';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill, type StatusPillTone } from '@/design/primitives/StatusPill';
import { TextField } from '@/design/primitives/TextField';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';
import {
  type AppTranslate,
  type I18nKey,
  type SupportedLocale,
  useAppTranslation,
} from '@/lib/i18n';
import { formatCalendarDate } from '@/lib/i18n/format-date';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import {
  isPuppyProfileOwnerRequiredError,
  useSavePuppyProfileMutation,
} from '@/lib/query/puppy';

type PuppyProfileAccessState = 'loading' | 'empty' | 'error' | 'owner' | 'nonOwner';
export type PuppyProfileSettingsReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read'
  | 'permission-denied';

type PuppyProfileStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const puppyProfileStateMeta: Record<
  PuppyProfileSettingsReviewState,
  PuppyProfileStateMeta
> = {
  error: {
    bodyKey: 'more.puppy-profile.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'more.puppy-profile.states.error.status',
    titleKey: 'more.puppy-profile.states.error.title',
    tone: 'failed',
  },
  loading: {
    bodyKey: 'more.puppy-profile.states.loading.body',
    icon: 'paw',
    liveRegion: 'polite',
    statusKey: 'more.puppy-profile.states.loading.status',
    titleKey: 'more.puppy-profile.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'more.puppy-profile.states.offline-read.body',
    icon: 'lock',
    statusKey: 'more.puppy-profile.states.offline-read.status',
    titleKey: 'more.puppy-profile.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'more.puppy-profile.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'more.puppy-profile.states.pending-write.status',
    titleKey: 'more.puppy-profile.states.pending-write.title',
    tone: 'pending',
  },
  'permission-denied': {
    bodyKey: 'more.puppy-profile.states.permission-denied.body',
    icon: 'lock',
    role: 'alert',
    statusKey: 'more.puppy-profile.states.permission-denied.status',
    titleKey: 'more.puppy-profile.states.permission-denied.title',
    tone: 'failed',
  },
};

export type PuppyProfileSettingsScreenProps = Readonly<{
  accessState?: PuppyProfileAccessState;
  canManagePuppySettings?: boolean;
  isSaving?: boolean;
  onBack?: () => void;
  puppy: PuppyProfile | null;
  saveProfile: (profile: PuppyProfileInput, puppyId: string) => Promise<unknown> | unknown;
}>;

export function ConnectedPuppyProfileSettingsScreen() {
  const activeCare = useActiveCareContext();
  const saveMutation = useSavePuppyProfileMutation();
  const router = useRouter();

  return (
    <PuppyProfileSettingsScreen
      accessState={getPuppyProfileAccessState(activeCare)}
      isSaving={saveMutation.isPending}
      onBack={() => router.back()}
      puppy={activeCare.puppy}
      saveProfile={(profile, puppyId) => saveMutation.mutateAsync({
        profile,
        puppyId,
      })}
    />
  );
}

export function PuppyProfileSettingsScreen({
  accessState,
  canManagePuppySettings = true,
  isSaving = false,
  onBack,
  puppy,
  saveProfile,
}: PuppyProfileSettingsScreenProps) {
  const { locale, t } = useAppTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(puppy?.name ?? '');
  const [ageMode, setAgeMode] = useState<PuppyAgeMode>(
    puppy?.birth_date ? 'birth_date' : 'age_weeks',
  );
  const [ageWeeksText, setAgeWeeksText] = useState(
    String(puppy?.age_weeks_estimate ?? 8),
  );
  const [birthDate, setBirthDate] = useState(puppy?.birth_date ?? '');
  const [errorVisible, setErrorVisible] = useState(false);
  const [saveErrorKey, setSaveErrorKey] = useState<
    'errors.owner-only-settings' | 'errors.save-failed-connection' | null
  >(null);
  const effectiveAccessState = accessState ?? (canManagePuppySettings ? 'owner' : 'nonOwner');

  useEffect(() => {
    if (!puppy) {
      return;
    }

    setName(puppy.name);
    setAgeMode(puppy.birth_date ? 'birth_date' : 'age_weeks');
    setAgeWeeksText(String(puppy.age_weeks_estimate ?? 8));
    setBirthDate(puppy.birth_date ?? '');
  }, [puppy]);

  const selectedTrackerIds = useMemo(
    () => puppy?.quick_tracker_ids ?? [],
    [puppy?.quick_tracker_ids],
  );

  const handleSave = async () => {
    const result = puppyProfileInputSchema.safeParse({
      ageMode,
      ageWeeksEstimate: ageMode === 'age_weeks' ? parseAgeWeeks(ageWeeksText) : null,
      birthDate: ageMode === 'birth_date' && birthDate.trim() ? birthDate.trim() : null,
      name,
      selectedTrackerIds,
    });

    if (!result.success) {
      setErrorVisible(true);
      setSaveErrorKey(null);
      return;
    }

    setErrorVisible(false);
    setSaveErrorKey(null);

    if (puppy) {
      try {
        await saveProfile(result.data, puppy.id);
        setIsEditing(false);
      } catch (error) {
        setSaveErrorKey(isPuppyProfileOwnerRequiredError(error)
          ? 'errors.owner-only-settings'
          : 'errors.save-failed-connection');
      }
    }
  };

  if (effectiveAccessState === 'loading') {
    return <StateCard message={t('common.loading')} />;
  }

  if (effectiveAccessState === 'error') {
    return <AlertStateCard message={t('errors.load-failed')} />;
  }

  if (!puppy || effectiveAccessState === 'empty') {
    return <StateCard message={t('today.quick-log.unavailable.title')} />;
  }

  if (effectiveAccessState === 'nonOwner') {
    return <AlertStateCard message={t('errors.owner-only-settings')} />;
  }

  if (!isEditing) {
    const editAction = (
      <Button
        label={t('common.edit')}
        onPress={() => setIsEditing(true)}
        variant="tertiary"
      />
    );

    return (
      <Screen>
        {onBack ? (
          <ScreenHeader
            backLabel={t('more.screen-title')}
            onBack={onBack}
            title={t('more.puppy-profile.screen-title')}
            trailing={editAction}
          />
        ) : (
          <ScreenHeader
            title={t('more.puppy-profile.screen-title')}
            trailing={editAction}
          />
        )}
        <AvatarHero label={puppy.name} t={t} />
        <SettingsSection title={t('more.puppy-profile.sections.about')}>
          <ListRow meta={puppy.name} title={t('more.puppy-profile.field-name')} variant="settings" />
          <ListRow
            meta={formatBirthValue(puppy, locale)}
            subtitle={formatBirthSubtitle(puppy, t)}
            title={t('more.puppy-profile.field-birth-default')}
            variant="settings"
          />
          <DeferredAddRow title={t('more.puppy-profile.field-breed')} />
          <DeferredAddRow title={t('more.puppy-profile.field-gender')} />
        </SettingsSection>
        <SettingsSection title={t('more.puppy-profile.sections.optional')}>
          <DeferredAddRow title={t('more.puppy-profile.field-weight')} />
          <DeferredAddRow title={t('more.puppy-profile.field-microchip')} />
          <DeferredAddRow
            subtitle={t('more.puppy-profile.note-subtitle')}
            title={t('more.puppy-profile.field-note')}
          />
        </SettingsSection>
        <Card>
          <Stack direction="horizontal" gap="sm">
            <AppIcon color={tokens.color.text.secondary} name="lock" />
            <AppText style={styles.bannerText} tone="secondary" variant="footnote">
              {t('more.puppy-profile.hint')}
            </AppText>
          </Stack>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        backLabel={t('common.cancel')}
        onBack={() => setIsEditing(false)}
        title={t('more.puppy-profile.screen-title')}
        trailing={(
          <Button
            label={t('more.puppy-profile.save')}
            loading={isSaving}
            onPress={handleSave}
            variant="tertiary"
          />
        )}
      />
      <AvatarHero label={puppy.name} t={t} />
      {saveErrorKey ? <AlertStateCardContent message={t(saveErrorKey)} /> : null}
      <TextField
        errorText={errorVisible ? t('onboarding.puppy-profile.error-required') : undefined}
        label={t('more.puppy-profile.field-name')}
        onChangeText={setName}
        value={name}
      />
      <SegmentedControl
        accessibilityLabel={t('onboarding.puppy-profile.a11y-toggle')}
        onValueChange={setAgeMode}
        options={[
          {
            label: t('onboarding.puppy-profile.age-toggle-age'),
            value: 'age_weeks',
          },
          {
            label: t('onboarding.puppy-profile.age-toggle-date'),
            value: 'birth_date',
          },
        ]}
        value={ageMode}
      />
      {ageMode === 'age_weeks' ? (
        <TextField
          keyboardType="number-pad"
          label={t('onboarding.puppy-profile.age-toggle-age')}
          onChangeText={setAgeWeeksText}
          value={ageWeeksText}
        />
      ) : (
        <TextField
          label={t('onboarding.puppy-profile.age-toggle-date')}
          onChangeText={setBirthDate}
          placeholder={t('onboarding.puppy-profile.birth-date-placeholder')}
          value={birthDate}
        />
      )}
      <DeferredAddRow title={t('more.puppy-profile.field-breed')} />
      <DeferredAddRow title={t('more.puppy-profile.field-gender')} />
      <DeferredAddRow title={t('more.puppy-profile.field-weight')} />
      <DeferredAddRow title={t('more.puppy-profile.field-microchip')} />
      <DeferredAddRow title={t('more.puppy-profile.field-note')} />
      <AppText tone="secondary" variant="footnote">{t('more.puppy-profile.hint')}</AppText>
    </Screen>
  );
}

function AvatarHero({ label, t }: Readonly<{ label: string; t: AppTranslate }>) {
  return (
    <View style={styles.hero}>
      <View style={styles.avatarWrap}>
        <Avatar label={label} size="xl" />
        <View style={styles.editBadge}>
          <AppIcon color={tokens.color.text.primary} name="gear" size={16} />
        </View>
      </View>
      <Touchable
        accessibilityLabel={t('more.puppy-profile.change-photo')}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        minTarget="none"
        onPress={() => undefined}
        style={styles.changePhoto}>
        <AppText tone="disabled" variant="body">
          {t('more.puppy-profile.change-photo')}
        </AppText>
      </Touchable>
    </View>
  );
}

function SettingsSection({
  children,
  title,
}: PropsWithChildren<{
  title: string;
}>) {
  return (
    <Stack gap="xs">
      <SectionHeader title={title} titleStyle={styles.sectionTitle} />
      <ListGroup>{children}</ListGroup>
    </Stack>
  );
}

function DeferredAddRow({
  subtitle,
  title,
}: Readonly<{ subtitle?: string; title: string }>) {
  const { t } = useAppTranslation();

  return (
    <ListRow
      accessibilityLabel={title}
      accessory="chevron"
      disabled
      meta={t('more.puppy-profile.add-value')}
      onPress={() => undefined}
      subtitle={subtitle}
      title={title}
      variant="settings"
    />
  );
}

function StateCard({ message }: Readonly<{ message: string }>) {
  return (
    <Screen>
      <Card>
        <AppText>{message}</AppText>
      </Card>
    </Screen>
  );
}

function AlertStateCard({ message }: Readonly<{ message: string }>) {
  return (
    <Screen>
      <AlertStateCardContent message={message} />
    </Screen>
  );
}

function AlertStateCardContent({ message }: Readonly<{ message: string }>) {
  return (
    <Card
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <AppText>{message}</AppText>
    </Card>
  );
}

export function PuppyProfileSettingsStatePreview({
  state,
}: Readonly<{
  state: PuppyProfileSettingsReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = puppyProfileStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`puppy-profile-state-${state}`}
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

function parseAgeWeeks(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function formatBirthValue(
  puppy: PuppyProfile,
  locale: SupportedLocale,
): string | undefined {
  return puppy.birth_date
    ? formatCalendarDate(puppy.birth_date, locale)
    : undefined;
}

function formatBirthSubtitle(
  puppy: PuppyProfile,
  t: AppTranslate,
): string | undefined {
  if (typeof puppy.age_weeks_estimate === 'number') {
    return t('more.puppy-profile.dob-subtitle-weeks', { count: puppy.age_weeks_estimate });
  }

  return undefined;
}

const styles = StyleSheet.create({
  avatarWrap: {
    position: 'relative',
  },
  bannerText: {
    flex: 1,
    flexShrink: 1,
  },
  changePhoto: {
    marginTop: tokens.space[3],
  },
  editBadge: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: -2,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 32,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: tokens.space[3],
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
});

function getPuppyProfileAccessState(
  activeCare: ReturnType<typeof useActiveCareContext>,
): PuppyProfileAccessState {
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
