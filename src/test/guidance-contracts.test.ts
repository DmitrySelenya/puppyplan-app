import {
  STARTER_GUIDANCE_CONTENT,
  applyGuidanceAction,
  getStarterGuidanceForDay,
  guidanceCompletionStateSchema,
  guidanceCompletionStates,
  starterGuidanceContentSchema,
  starterGuidanceTopicDetailSchema,
} from '@/contracts/guidance';

describe('starter guidance contracts', () => {
  it('keeps local starter guidance content explicitly versioned and day-addressable', () => {
    expect(STARTER_GUIDANCE_CONTENT.version).toMatch(/^local-\d{4}-\d{2}-\d{2}-v\d+$/);
    expect(STARTER_GUIDANCE_CONTENT.topics).toHaveLength(14);
    expect(starterGuidanceContentSchema.parse(STARTER_GUIDANCE_CONTENT)).toEqual(
      STARTER_GUIDANCE_CONTENT,
    );

    expect(STARTER_GUIDANCE_CONTENT.topics.map((topic) => topic.dayNumber)).toEqual(
      Array.from({ length: 14 }, (_, index) => index + 1),
    );
    expect(new Set(STARTER_GUIDANCE_CONTENT.topics.map((topic) => topic.id)).size).toBe(14);
  });

  it('selects at most one guidance topic for a day', () => {
    expect(getStarterGuidanceForDay({
      dayNumber: 1,
    })).toMatchObject({
      dayNumber: 1,
      id: 'first_night',
    });

    expect(getStarterGuidanceForDay({
      completedTopicIds: ['first_night'],
      dayNumber: 1,
    })).toBeNull();

    expect(getStarterGuidanceForDay({
      dayNumber: 15,
    })).toBeNull();
  });

  it('limits guidance completion state to read, practiced, and skip', () => {
    expect(guidanceCompletionStates).toEqual(['read', 'practiced', 'skip']);
    expect(guidanceCompletionStateSchema.safeParse('read').success).toBe(true);
    expect(guidanceCompletionStateSchema.safeParse('practiced').success).toBe(true);
    expect(guidanceCompletionStateSchema.safeParse('skip').success).toBe(true);
    expect(guidanceCompletionStateSchema.safeParse('dismissed').success).toBe(false);
  });

  it('applies read, practiced, and skip transitions without extra state names', () => {
    expect(applyGuidanceAction({
      action: 'read',
      topicId: 'first_night',
    })).toMatchObject({
      state: 'read',
      topicId: 'first_night',
    });

    expect(applyGuidanceAction({
      action: 'practiced',
      topicId: 'first_night',
    })).toMatchObject({
      state: 'practiced',
      topicId: 'first_night',
    });

    expect(applyGuidanceAction({
      action: 'skip',
      topicId: 'first_night',
    })).toMatchObject({
      state: 'skip',
      topicId: 'first_night',
    });
  });

  it('keeps topic detail payloads strict and free of private free text', () => {
    const topic = getStarterGuidanceForDay({ dayNumber: 2 });

    expect(topic).not.toBeNull();

    const detail = {
      contentVersion: STARTER_GUIDANCE_CONTENT.version,
      dayNumber: topic?.dayNumber,
      escalationCopyKey: topic?.escalationCopyKey,
      id: topic?.id,
      titleKey: topic?.titleKey,
    };

    expect(starterGuidanceTopicDetailSchema.safeParse(detail).success).toBe(true);
    expect(starterGuidanceTopicDetailSchema.safeParse({
      ...detail,
      privateNote: 'do not persist free text in the guidance contract',
    }).success).toBe(false);
  });
});
