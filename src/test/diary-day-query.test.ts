import { createDiaryForegroundKeys, refetchDiaryKeys } from '@/lib/query/diary-day';

describe('Diary foreground convergence', () => {
  it('AC-P5-FOREGROUND invalidates durable reminders and all timeline variants', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const keys = createDiaryForegroundKeys('household-1', 'puppy-1');

    await refetchDiaryKeys({ invalidateQueries }, keys);

    expect(keys).toEqual([
      ['reminders', 'household-1', 'puppy-1'],
      ['events', 'household-1', 'puppy-1', 'timeline'],
    ]);
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reminders', 'household-1', 'puppy-1'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['events', 'household-1', 'puppy-1', 'timeline'],
    });
  });
});
