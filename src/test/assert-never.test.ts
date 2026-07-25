import { assertNever } from '@/lib/assertNever';
import { applyQuickLogQueueTransition } from '@/lib/queue/state-machine';

describe('assertNever', () => {
  it('throws, surfacing the discriminant tag', () => {
    expect(() => assertNever({ type: 'surprise' } as never)).toThrow(/surprise/);
  });

  it('prefixes the provided context', () => {
    expect(() => assertNever({ type: 'boom' } as never, 'myReducer')).toThrow(/^myReducer: /);
  });

  it('never interpolates non-discriminant fields, so user text cannot leak', () => {
    const withNote = () =>
      assertNever({ type: 'x', note: 'free-text-that-must-not-leak' } as never);
    expect(withNote).toThrow(/Unhandled discriminated union member: x/);
    expect(withNote).not.toThrow(/free-text-that-must-not-leak/);
  });
});

describe('applyQuickLogQueueTransition exhaustiveness guard', () => {
  it('throws on an unknown (legacy/deserialized) transition type instead of returning undefined', () => {
    expect(() =>
      applyQuickLogQueueTransition({} as never, { type: 'mark_totally_unknown' } as never),
    ).toThrow(/applyQuickLogQueueTransition: Unhandled discriminated union member: mark_totally_unknown/);
  });
});
