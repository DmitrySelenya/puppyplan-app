import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { Avatar } from '@/design/primitives/Avatar';
import { PendingDot } from '@/design/primitives/PendingDot';
import { useAppTranslation, type I18nKey } from '@/lib/i18n';

export type DiaryHeaderTimeOfDay = 'morning' | 'midday' | 'evening';

export type DiaryHeaderProps = Readonly<{
  puppyName?: string;
  recap?: string;
  /** Background sync in progress: shown as a subtle, text-free dot by the avatar. */
  syncing?: boolean;
  timeOfDay?: DiaryHeaderTimeOfDay;
  todayDate?: string;
}>;

const greetingKeys = {
  evening: {
    noName: 'today.header.greeting-evening-no-name',
    withName: 'today.header.greeting-evening',
  },
  midday: {
    noName: 'today.header.greeting-midday-no-name',
    withName: 'today.header.greeting-midday',
  },
  morning: {
    noName: 'today.header.greeting-morning-no-name',
    withName: 'today.header.greeting-morning',
  },
} as const satisfies Record<DiaryHeaderTimeOfDay, { noName: I18nKey; withName: I18nKey }>;

/** Diary greeting header: greeting + date + puppy avatar, with an optional recap line. */
export function DiaryHeader({
  puppyName,
  recap,
  syncing = false,
  timeOfDay = 'morning',
  todayDate,
}: DiaryHeaderProps) {
  const { fontScale } = useWindowDimensions();
  const { locale, t } = useAppTranslation();
  const name = puppyName?.trim();
  const keys = greetingKeys[timeOfDay];
  const greeting = name ? t(keys.withName, { name }) : t(keys.noName);
  const date = formatHeaderDate(todayDate, locale);

  return (
    <View style={styles.header} testID="diary-header">
      <View
        style={[styles.row, fontScale >= 2 ? styles.accessibilityRow : null]}
        testID="diary-header-row">
        <View style={styles.copy}>
          <AppText variant={fontScale >= 2 ? 'title2' : 'title1'}>{greeting}</AppText>
          {date ? (
            <AppText style={styles.date} tone="secondary" variant="footnote">
              {date}
            </AppText>
          ) : null}
        </View>
        {syncing || name ? (
          <View style={styles.trailing}>
            {syncing ? (
              <PendingDot
                accessibilityLabel={t('today.states.pending-write.status')}
                testID="diary-sync-indicator"
              />
            ) : null}
            {name ? (
              <Avatar initials={name.slice(0, 1)} label={name} size="lg" tone="accent" />
            ) : null}
          </View>
        ) : null}
      </View>
      {recap ? (
        <AppText tone="secondary" variant="footnote">
          {recap}
        </AppText>
      ) : null}
    </View>
  );
}

function formatHeaderDate(todayDate: string | undefined, locale: string): string {
  const date = todayDate === undefined ? new Date() : new Date(`${todayDate}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}

const styles = StyleSheet.create({
  accessibilityRow: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    marginTop: 4,
  },
  header: {
    gap: 10,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
