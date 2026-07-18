import type { QuickLogDetailDraft, QuickLogDetailTrackerId } from '@/contracts/quick-log';

export type QuickEntryParseOptions = Readonly<{
  locale: 'en' | 'ru';
  now: Date;
}>;

export type ParsedQuickEntry = Readonly<{
  detailDraft: QuickLogDetailDraft;
  occurredAt: string;
  sourceLine: string;
  trackerId: QuickLogDetailTrackerId;
}>;

export function parseQuickEntryLine(
  line: string,
  options: QuickEntryParseOptions,
): ParsedQuickEntry {
  const sourceLine = line.trim();
  const { content, occurredAt } = parseTimePrefix(sourceLine, options.now);
  const normalized = content.toLocaleLowerCase(options.locale);
  const classification = classify(normalized, options.locale);

  if (classification?.trackerId === 'potty') {
    return {
      detailDraft: {
        note: sourceLine,
        occurredAt,
        subtype: classification.subtype,
        trackerId: 'potty',
      },
      occurredAt,
      sourceLine,
      trackerId: 'potty',
    };
  }

  if (classification?.trackerId === 'sleep') {
    return {
      detailDraft: {
        action: classification.action,
        note: sourceLine,
        occurredAt,
        trackerId: 'sleep',
      },
      occurredAt,
      sourceLine,
      trackerId: 'sleep',
    };
  }

  if (classification !== undefined) {
    const detailDraft = classification.trackerId === 'feeding'
      ? { amount: 'meal' as const, note: sourceLine, occurredAt, trackerId: 'feeding' as const }
      : { note: sourceLine, occurredAt, trackerId: classification.trackerId };
    return {
      detailDraft,
      occurredAt,
      sourceLine,
      trackerId: classification.trackerId,
    };
  }

  return {
    detailDraft: { note: sourceLine, occurredAt, trackerId: 'observation' },
    occurredAt,
    sourceLine,
    trackerId: 'observation',
  };
}

export function parseQuickEntryBatch(
  text: string,
  options: QuickEntryParseOptions,
): readonly ParsedQuickEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => parseQuickEntryLine(line, options));
}

type QuickEntryClassification =
  | Readonly<{ subtype: 'inside' | 'outside' | 'poop'; trackerId: 'potty' }>
  | Readonly<{ action: 'start' | 'wake'; trackerId: 'sleep' }>
  | Readonly<{ trackerId: 'feeding' | 'walk' | 'zoomies' }>;

function parseTimePrefix(sourceLine: string, now: Date): Readonly<{
  content: string;
  occurredAt: string;
}> {
  const match = /^(?<hour>[01]?\d|2[0-3]):(?<minute>[0-5]\d)(?:\s+|$)/.exec(sourceLine);
  if (match?.groups === undefined) {
    return { content: sourceLine, occurredAt: now.toISOString() };
  }

  const occurredAt = new Date(now);
  occurredAt.setHours(Number(match.groups.hour), Number(match.groups.minute), 0, 0);
  return {
    content: sourceLine.slice(match[0].length).trim(),
    occurredAt: occurredAt.toISOString(),
  };
}

function classify(content: string, locale: 'en' | 'ru'): QuickEntryClassification | undefined {
  if (locale === 'ru') {
    if (hasAny(content, ['авария', 'в клетку', 'на пеленку'])) {
      return { subtype: 'inside', trackerId: 'potty' };
    }
    if (hasAny(content, ['покакал', 'покакали'])) {
      return { subtype: 'poop', trackerId: 'potty' };
    }
    if (hasAny(content, ['попис', 'пописал', 'пописали'])) {
      return { subtype: 'outside', trackerId: 'potty' };
    }
    if (hasAny(content, ['поел', 'поели', 'корм'])) {
      return { trackerId: 'feeding' };
    }
    if (hasAny(content, ['уснул', 'заснул'])) {
      return { action: 'start', trackerId: 'sleep' };
    }
    if (hasAny(content, ['проснулся', 'встал'])) {
      return { action: 'wake', trackerId: 'sleep' };
    }
    if (hasAny(content, ['гулять', 'прогулка', 'вышли'])) {
      return { trackerId: 'walk' };
    }
    if (hasAny(content, ['зумис', 'бегает', 'бесится'])) {
      return { trackerId: 'zoomies' };
    }
    return undefined;
  }

  if (hasEnglishWord(content, ['accident', 'inside'])) {
    return { subtype: 'inside', trackerId: 'potty' };
  }
  if (hasEnglishWord(content, ['poop', 'pooped'])) {
    return { subtype: 'poop', trackerId: 'potty' };
  }
  if (hasEnglishWord(content, ['pee', 'peed'])) {
    return { subtype: 'outside', trackerId: 'potty' };
  }
  if (hasEnglishWord(content, ['ate', 'fed', 'meal'])) {
    return { trackerId: 'feeding' };
  }
  if (hasEnglishWord(content, ['asleep', 'slept'])) {
    return { action: 'start', trackerId: 'sleep' };
  }
  if (hasEnglishWord(content, ['woke', 'awake'])) {
    return { action: 'wake', trackerId: 'sleep' };
  }
  if (hasEnglishWord(content, ['walk', 'outside'])) {
    return { trackerId: 'walk' };
  }
  if (hasEnglishWord(content, ['zoomies', 'running'])) {
    return { trackerId: 'zoomies' };
  }
  return undefined;
}

function hasAny(content: string, values: readonly string[]): boolean {
  return values.some((value) => content.includes(value));
}

function hasEnglishWord(content: string, values: readonly string[]): boolean {
  const words = new Set(content.match(/[a-z]+/g) ?? []);
  return values.some((value) => words.has(value));
}
