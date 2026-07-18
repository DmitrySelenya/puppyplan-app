import type { AppTranslate } from '@/lib/i18n';

const MINUTES_PER_HOUR = 60;

/**
 * Renders a span of minutes the way an owner reads it back.
 *
 * An overnight stretch arrives as raw minutes (414), which nobody can turn into "just under seven
 * hours" at a glance, so anything past an hour is split into hours and minutes.
 */
export function formatDurationMinutes(minutes: number, t: AppTranslate): string {
  const total = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const hours = Math.floor(total / MINUTES_PER_HOUR);
  const remainder = total % MINUTES_PER_HOUR;

  if (hours === 0) {
    return t('common.duration-minutes', { minutes: total });
  }

  if (remainder === 0) {
    return t('common.duration-hours', { hours });
  }

  return t('common.duration-hours-minutes', { hours, minutes: remainder });
}
