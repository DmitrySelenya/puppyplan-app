import { tokens } from '@/design/tokens';

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );

  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('generated design tokens', () => {
  it('exports corrected color, spacing, radius, motion, and haptic values', () => {
    expect(tokens.color.surface.base).toBe('#F6EFE3');
    expect(tokens.color.text.tertiary).toBe('#766C5A');
    expect(tokens.space[4]).toBe(16);
    expect(tokens.space[10]).toBe(40);
    expect(tokens.layout.screenPaddingY).toBe(24);
    expect(tokens.radius.card).toBe(18);
    expect(tokens.radius.chip).toBe(13);
    expect(tokens.radius.full).toBe(999);
    expect(tokens.radius.hero).toBe(20);
    expect(tokens.elevation[1].androidElevation).toBe(2);
    expect(tokens.elevation[2].androidElevation).toBe(6);
    expect(tokens.elevation[3].androidElevation).toBe(12);
    expect(tokens.motion.duration.fast).toBe(160);
    expect(tokens.haptic.warning.android).toBe('REJECT');
  });

  it('keeps tertiary text at WCAG AA contrast against app surfaces', () => {
    expect(contrastRatio(tokens.color.text.tertiary, tokens.color.surface.base)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrastRatio(tokens.color.text.tertiary, tokens.color.surface.raised),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the completed health pill out of the retired Calm Teal palette', () => {
    const completed = tokens.color.pill.completed;
    const retiredCalmTeal = new Set(['#175255', '#EAF3F3']);

    expect(retiredCalmTeal.has(completed.fill)).toBe(false);
    expect(retiredCalmTeal.has(completed.text)).toBe(false);
    expect(completed.fill).not.toBe(tokens.color.pill.confirmed.fill);
    expect(completed.text).not.toBe(tokens.color.pill.confirmed.text);
    expect(contrastRatio(completed.text, completed.fill)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every typography style at zero letter spacing', () => {
    expect(Object.values(tokens.typography.scale).every((style) => style.letterSpacing === 0)).toBe(true);
  });

  it('exports the canonical business timing references', () => {
    expect(tokens.business.timing).toEqual({
      accidentalDoubleTapWindowSeconds: 3,
      duplicateCareWarningWindowSeconds: 60,
    });
  });
});
