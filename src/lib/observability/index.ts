import type { QuickLogQueueErrorCategory } from '@/lib/queue';

type JsonLike =
  | string
  | number
  | boolean
  | null
  | readonly JsonLike[]
  | { readonly [key: string]: JsonLike };

export type ObservabilityPayload = Readonly<{
  area?: string;
  breadcrumbs?: readonly JsonLike[];
  contexts?: Record<string, JsonLike>;
  errorCategory?: QuickLogQueueErrorCategory;
  extra?: Record<string, JsonLike>;
  message?: string;
  operation?: string;
  tags?: Record<string, JsonLike>;
}>;

export type ObservabilityEvent = ObservabilityPayload & Readonly<{
  message: string;
}>;

export type ObservabilityAdapter = Readonly<{
  captureException(event: ObservabilityEvent): void;
}>;

export type ObservabilityReporter = Readonly<{
  captureException(error: unknown, payload: ObservabilityPayload): void;
}>;

const noopObservabilityAdapter: ObservabilityAdapter = {
  captureException: () => undefined,
};

const forbiddenKeyPattern = new RegExp([
  'backend.*error',
  'raw.*error',
  'raw.*email',
  '(?:household|puppy|user|actor)_?id',
  'client.*event_?id',
  'created.*by(?:_?id)?',
  'puppy.*name',
  'household.*member',
  'member.*name',
  'display.*name',
  'actor.*name',
  'caregiver.*name',
  'owner.*name',
  'note',
  'email',
  'provider',
  'media.*url',
  'photo',
  'token',
  'invite',
  'share',
  'health.*(?:text|summary|detail)',
  'symptom',
  'diagnosis',
  'push',
  'notification.*body',
].join('|'), 'iu');
const privateStringPattern = new RegExp([
  '@',
  'https?:\\/\\/',
  '\\b(?:private|backend|provider|puppydisplay)\\b',
  '\\b(?:authorization|bearer|invite|push|share|token)\\b',
  '\\b(?:AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{20,})\\b',
  '\\beyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}\\b',
  '\\b[A-Za-z0-9_-]{32,}\\b',
  '\\b(?:blood|cough|diagnosis|diarrhea|injection|limp|medication|rash|seizure|swelling|symptom|vaccine|vomit|wound)\\b',
].join('|'), 'iu');

export function scrubObservabilityPayload(payload: ObservabilityPayload): ObservabilityEvent {
  const scrubbed = scrubObject(payload) as Record<string, JsonLike>;

  return {
    ...scrubbed,
    message: 'Quick Log operation failed',
  } as ObservabilityEvent;
}

export function createObservabilityReporter(
  adapter: ObservabilityAdapter = noopObservabilityAdapter,
): ObservabilityReporter {
  return {
    captureException: (_error, payload) => {
      adapter.captureException(scrubObservabilityPayload(payload));
    },
  };
}

function scrubValue(value: JsonLike): JsonLike | undefined {
  if (Array.isArray(value)) {
    return value
      .map((item) => scrubValue(item))
      .filter((item): item is JsonLike => item !== undefined);
  }

  if (value !== null && typeof value === 'object') {
    return scrubObject(value as { readonly [key: string]: JsonLike });
  }

  if (typeof value === 'string' && privateStringPattern.test(value)) {
    return '[redacted]';
  }

  return value;
}

function scrubObject(value: { readonly [key: string]: JsonLike }): Record<string, JsonLike> {
  const scrubbed: Record<string, JsonLike> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (forbiddenKeyPattern.test(key)) {
      continue;
    }

    const nextValue = scrubValue(nestedValue);

    if (nextValue !== undefined) {
      scrubbed[key] = nextValue;
    }
  }

  return scrubbed;
}
