import { tokens } from '@/design/tokens';

export type DesignHapticEvent =
  | 'tapConfirm'
  | 'saveSuccess'
  | 'celebration'
  | 'warning'
  | 'selection'
  | 'error';

export type DesignHapticPatternName = keyof typeof tokens.haptic;
export type DesignHapticPattern = (typeof tokens.haptic)[DesignHapticPatternName];
export type DesignHapticAdapter = (
  patternName: DesignHapticPatternName,
  pattern: DesignHapticPattern,
) => void | Promise<void>;

const hapticPatternByEvent = {
  celebration: 'success',
  error: 'error',
  saveSuccess: 'success',
  selection: 'medium',
  tapConfirm: 'light',
  warning: 'warning',
} as const satisfies Record<DesignHapticEvent, DesignHapticPatternName>;

let adapter: DesignHapticAdapter | null = null;

export function configureDesignHaptics(nextAdapter: DesignHapticAdapter | null) {
  adapter = nextAdapter;
}

export async function haptic(event: DesignHapticEvent) {
  const patternName = hapticPatternByEvent[event];
  const pattern = tokens.haptic[patternName];

  try {
    await adapter?.(patternName, pattern);
  } catch {
    // Haptics are a best-effort enhancement; adapter failures must not affect UI actions.
  }
}

export { hapticPatternByEvent };
