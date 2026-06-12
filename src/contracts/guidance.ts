import { z } from 'zod';

export const STARTER_GUIDANCE_CONTENT_VERSION = 'local-2026-06-12-v1';

export const guidanceCompletionStates = ['read', 'practiced', 'skip'] as const;
export const guidanceCompletionStateSchema = z.enum(guidanceCompletionStates);

export const starterGuidanceTopicIds = [
  'first_night',
  'potty_rhythm',
  'biting_play',
  'crate_settling',
  'handling',
  'socialization_window',
  'vet_visit_prep',
  'quiet_sleep',
  'feeding_rhythm',
  'alone_time',
  'leash_intro',
  'calm_greetings',
  'chew_swap',
  'weekly_rhythm',
] as const;

export const starterGuidanceTopicIdSchema = z.enum(starterGuidanceTopicIds);

export const guidanceCopyKeySchema = z.string()
  .regex(/^guidance\.[a-z0-9-]+\.(title|body|escalation)$/);

export const starterGuidanceTopicDetailSchema = z.object({
  contentVersion: z.literal(STARTER_GUIDANCE_CONTENT_VERSION),
  dayNumber: z.number().int().min(1).max(14),
  escalationCopyKey: guidanceCopyKeySchema,
  id: starterGuidanceTopicIdSchema,
  titleKey: guidanceCopyKeySchema,
}).strict();

export const starterGuidanceTopicSchema = starterGuidanceTopicDetailSchema.extend({
  bodyKey: guidanceCopyKeySchema,
}).strict();

export const starterGuidanceContentSchema = z.object({
  version: z.literal(STARTER_GUIDANCE_CONTENT_VERSION),
  topics: z.array(starterGuidanceTopicSchema).length(14),
}).strict().superRefine((content, context) => {
  const topicIds = new Set<string>();
  const dayNumbers = new Set<number>();

  for (const topic of content.topics) {
    topicIds.add(topic.id);
    dayNumbers.add(topic.dayNumber);
  }

  if (topicIds.size !== content.topics.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Starter guidance topic ids must be unique.',
      path: ['topics'],
    });
  }

  if (dayNumbers.size !== content.topics.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Starter guidance day numbers must be unique.',
      path: ['topics'],
    });
  }
});

export const guidanceActionSchema = z.object({
  action: guidanceCompletionStateSchema,
  topicId: starterGuidanceTopicIdSchema,
}).strict();

export const guidanceProgressSchema = z.object({
  contentVersion: z.literal(STARTER_GUIDANCE_CONTENT_VERSION),
  state: guidanceCompletionStateSchema,
  topicId: starterGuidanceTopicIdSchema,
}).strict();

export type GuidanceCompletionState = z.infer<typeof guidanceCompletionStateSchema>;
export type StarterGuidanceTopicId = z.infer<typeof starterGuidanceTopicIdSchema>;
export type StarterGuidanceTopic = z.infer<typeof starterGuidanceTopicSchema>;
export type StarterGuidanceContent = z.infer<typeof starterGuidanceContentSchema>;
export type GuidanceAction = z.infer<typeof guidanceActionSchema>;
export type GuidanceProgress = z.infer<typeof guidanceProgressSchema>;

export const STARTER_GUIDANCE_CONTENT = starterGuidanceContentSchema.parse({
  version: STARTER_GUIDANCE_CONTENT_VERSION,
  topics: starterGuidanceTopicIds.map((id, index) => ({
    bodyKey: `guidance.${id.replaceAll('_', '-')}.body`,
    contentVersion: STARTER_GUIDANCE_CONTENT_VERSION,
    dayNumber: index + 1,
    escalationCopyKey: `guidance.${id.replaceAll('_', '-')}.escalation`,
    id,
    titleKey: `guidance.${id.replaceAll('_', '-')}.title`,
  })),
});

export function getStarterGuidanceForDay(input: Readonly<{
  completedTopicIds?: readonly StarterGuidanceTopicId[];
  dayNumber: number;
}>): StarterGuidanceTopic | null {
  if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1 || input.dayNumber > 14) {
    return null;
  }

  const topic = STARTER_GUIDANCE_CONTENT.topics[input.dayNumber - 1];

  if (topic === undefined) {
    return null;
  }

  if (input.completedTopicIds?.includes(topic.id) === true) {
    return null;
  }

  return topic;
}

export function applyGuidanceAction(action: GuidanceAction): GuidanceProgress {
  const parsedAction = guidanceActionSchema.parse(action);

  return guidanceProgressSchema.parse({
    contentVersion: STARTER_GUIDANCE_CONTENT_VERSION,
    state: parsedAction.action,
    topicId: parsedAction.topicId,
  });
}
