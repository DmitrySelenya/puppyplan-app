import type { DiaryPlannedItem } from '@/contracts/diary-day';
import type { QuickLogDetailDraft, QuickLogPottySubtype } from '@/contracts/quick-log';
import { createReminderCheckOffClientEventId } from '@/contracts/reminders';
import type { QuickLogDetailedMutationVariables } from '@/lib/query/quick-log';

type DiaryCheckOffContext = Readonly<{
  householdId: string;
  puppyId: string;
  todayDate: string;
}>;

export function createDiaryCheckOffVariables(input: Readonly<{
  context: DiaryCheckOffContext;
  item: DiaryPlannedItem;
  occurredAt: string;
  pottySubtype?: QuickLogPottySubtype;
}>): QuickLogDetailedMutationVariables {
  const detailDraft = createCheckOffDetailDraft(input);

  return {
    clientEventId: createReminderCheckOffClientEventId({
      reminderId: input.item.reminderId,
      scheduledFor: input.item.scheduledFor,
    }),
    detailDraft,
    householdId: input.context.householdId,
    occurredAt: input.occurredAt,
    puppyId: input.context.puppyId,
    reminderLink: {
      reminderId: input.item.reminderId,
      scheduledFor: input.item.scheduledFor,
    },
    todayDate: input.context.todayDate,
    trackerId: input.item.trackerId,
  };
}

function createCheckOffDetailDraft(input: Readonly<{
  item: DiaryPlannedItem;
  occurredAt: string;
  pottySubtype?: QuickLogPottySubtype;
}>): QuickLogDetailDraft {
  const { item, occurredAt } = input;

  if (item.trackerId === 'potty') {
    const scheduledSubtype = item.variant === 'outside'
      || item.variant === 'inside'
      || item.variant === 'poop'
      ? item.variant
      : undefined;
    const subtype = input.pottySubtype ?? scheduledSubtype;

    if (subtype === undefined) {
      throw new Error('reminder_potty_requires_subtype');
    }

    return { occurredAt, subtype, trackerId: 'potty' };
  }
  if (item.trackerId === 'feeding') {
    return { amount: 'meal', occurredAt, trackerId: 'feeding' };
  }
  if (item.trackerId === 'sleep') {
    return item.amount?.unit === 'min'
      ? {
        action: 'retrospective',
        durationMinutes: item.amount.value,
        occurredAt,
        trackerId: 'sleep',
      }
      : { occurredAt, trackerId: 'sleep' };
  }
  if (item.trackerId === 'walk') {
    return {
      occurredAt,
      ...(item.amount?.unit === 'min' ? { durationMinutes: item.amount.value } : {}),
      trackerId: 'walk',
    };
  }
  if (item.trackerId === 'zoomies') {
    return { occurredAt, trackerId: 'zoomies' };
  }
  if (item.trackerId === 'training') {
    return { occurredAt, trackerId: 'training' };
  }

  if (item.title === undefined && item.note === undefined) {
    throw new Error('reminder_observation_requires_title');
  }

  return {
    occurredAt,
    ...(item.title !== undefined ? { title: item.title } : {}),
    ...(item.note !== undefined ? { note: item.note } : {}),
    trackerId: 'observation',
  };
}
