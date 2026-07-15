import { render, screen } from '@testing-library/react-native';

import { FactCard } from '@/design/primitives/FactCard';
import { designFontFamilies } from '@/design/fonts';

const longNote = 'сначала лег, но потом встал и начал пытаться раскопать пеленку и так несколько '
  + 'раз по кругу. Тоже самое потом делал и в клетке. Он практически засыпает, потом дергается, '
  + 'поднимается и копает';

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, entry) => ({ ...merged, ...flattenStyle(entry) }),
      {},
    );
  }

  return style === null || style === undefined ? {} : { ...(style as Record<string, unknown>) };
}

describe('FactCard title role', () => {
  it('AC-P33-PROSE sets a generated label in the display face and lets it wrap', () => {
    render(
      <FactCard
        accessibilityLabel="Slept"
        icon="moon"
        time="6:35 AM"
        title="Slept 10:56 PM–11:56 AM · 13 hr"
      />,
    );

    const title = screen.getByText('Slept 10:56 PM–11:56 AM · 13 hr');

    expect(flattenStyle(title.props.style).fontFamily).toBe(designFontFamilies.display.semibold);
    // A generated label is short; clamping it would truncate legitimate wrapping at large
    // Dynamic Type sizes for no gain.
    expect(title.props.numberOfLines).toBeUndefined();
  });

  it('AC-P33-PROSE sets an owner-written note in the text face and clamps it', () => {
    render(
      <FactCard
        accessibilityLabel="Quick note"
        icon="paw"
        time="12:09 AM"
        title={longNote}
        titleKind="prose"
      />,
    );

    const title = screen.getByText(longNote);

    // Lora SemiBold is the display face for headings and generated labels. An unclamped paragraph
    // set in it fills the whole screen once Dynamic Type scales it up.
    expect(flattenStyle(title.props.style).fontFamily).toBe(designFontFamilies.text.regular);
    expect(title.props.numberOfLines).toBe(3);
  });
});
