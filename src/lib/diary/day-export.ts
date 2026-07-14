export type DiaryDayExportItem = Readonly<{
  clientEventId: string;
  note?: string;
  occurredAt: string;
  title: string;
}>;

export type FormatDiaryDayExportInput = Readonly<{
  items: readonly DiaryDayExportItem[];
  locale: string;
  timeZone: string;
}>;

export function formatDiaryDayExport(input: FormatDiaryDayExportInput): string {
  const formatter = new Intl.DateTimeFormat(input.locale, {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: input.timeZone,
  });

  return input.items
    .slice()
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)
      || left.clientEventId.localeCompare(right.clientEventId))
    .map((item) => {
      const description = item.note === undefined
        ? item.title
        : `${item.title} — ${item.note}`;
      return `${formatter.format(new Date(item.occurredAt))} ${description}`;
    })
    .join('\n');
}
