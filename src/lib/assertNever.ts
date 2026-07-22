// Exhaustiveness guard for discriminated unions. Call it in the `default` branch of a
// `switch` (or the unreachable tail of an if/else chain) over a union: TypeScript narrows
// `value` to `never`, so leaving a union member unhandled becomes a compile error that
// names the missing case. At runtime it throws instead of silently falling through, so a
// malformed or legacy discriminant deserialized from storage surfaces loudly rather than
// returning `undefined`.
//
// Privacy: the message carries only the discriminant tag (`type`/`kind`), never the rest of
// the value — union members can hold user text, and we must not log raw notes/names.
export function assertNever(value: never, context?: string): never {
  const tag =
    value && typeof value === 'object'
      ? ((value as { type?: unknown; kind?: unknown }).type ??
        (value as { kind?: unknown }).kind ??
        '[object]')
      : value;
  const prefix = context ? `${context}: ` : '';
  throw new Error(`${prefix}Unhandled discriminated union member: ${String(tag)}`);
}
