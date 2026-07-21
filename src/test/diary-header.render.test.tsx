import * as React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { DiaryHeader } from '@/features/today/components/DiaryHeader';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';
import { tokens } from '@/design/tokens';

const SYNTHETIC_NAME = 'Mochi';
const SYNTHETIC_LONG_NAME = 'СверхдлинноеИмяЩенка';
let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({ fontScale: mockFontScale, height: 667, scale: 2, width: 375 }),
  });
});

function renderHeader(node: React.ReactElement) {
  return render(<AppProviders>{node}</AppProviders>);
}

describe('DiaryHeader', () => {
  beforeEach(async () => {
    mockFontScale = 1;
    await i18n.changeLanguage('en');
  });

  it('greets by name for the current time of day', () => {
    renderHeader(
      <DiaryHeader puppyName={SYNTHETIC_NAME} timeOfDay="morning" todayDate="2026-05-14" />,
    );

    expect(
      screen.getByText(i18n.t('today.header.greeting-morning', { name: SYNTHETIC_NAME })),
    ).toBeTruthy();
    // Avatar exposes the pet name as its accessible label.
    expect(screen.getByLabelText(SYNTHETIC_NAME)).toBeTruthy();
    expect(screen.getByTestId('diary-header')).toBeTruthy();
  });

  it('AC-DT-1 AC-DT-4: gets the Diary greeting ceiling from the title1 variant policy', () => {
    renderHeader(
      <DiaryHeader puppyName={SYNTHETIC_NAME} timeOfDay="morning" todayDate="2026-05-14" />,
    );

    expect(
      screen.getByText(i18n.t('today.header.greeting-morning', { name: SYNTHETIC_NAME })).props
        .maxFontSizeMultiplier,
    ).toBe(1.8);

    const source = readFileSync(
      join(process.cwd(), 'src/features/today/components/DiaryHeader.tsx'),
      'utf8',
    );
    expect(source).not.toContain('maxFontSizeMultiplier');
  });

  it.each([
    { fontScale: 1.999, expectedFontSize: tokens.typography.scale.title1.fontSize },
    { fontScale: 2, expectedFontSize: tokens.typography.scale.title2.fontSize },
  ])('AC-DT-2D AC-DT-2E keeps the complete long greeting with adaptive title anatomy at fontScale $fontScale', ({
    expectedFontSize,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    renderHeader(<DiaryHeader puppyName={SYNTHETIC_LONG_NAME} timeOfDay="morning" />);

    const greetingCopy = i18n.t('today.header.greeting-morning', { name: SYNTHETIC_LONG_NAME });
    const greeting = screen.getByText(greetingCopy);
    expect(greeting.props.children).toBe(greetingCopy);
    expect(greeting.props.numberOfLines).toBeUndefined();
    expect(greeting.props.allowFontScaling).toBe(true);
    expect(greeting.props.maxFontSizeMultiplier).toBe(1.8);
    expect(StyleSheet.flatten(greeting.props.style).fontSize).toBe(expectedFontSize);
    expect(screen.getByLabelText(SYNTHETIC_LONG_NAME)).toBeTruthy();
  });

  it('switches greeting copy by time of day', () => {
    renderHeader(<DiaryHeader puppyName={SYNTHETIC_NAME} timeOfDay="evening" />);
    expect(
      screen.getByText(i18n.t('today.header.greeting-evening', { name: SYNTHETIC_NAME })),
    ).toBeTruthy();
  });

  it('falls back to a name-less greeting and hides the avatar when no name is set', () => {
    renderHeader(<DiaryHeader timeOfDay="midday" />);

    expect(screen.getByText(i18n.t('today.header.greeting-midday-no-name'))).toBeTruthy();
    expect(screen.queryByLabelText(SYNTHETIC_NAME)).toBeNull();
  });

  it('renders an optional recap line', () => {
    renderHeader(
      <DiaryHeader puppyName={SYNTHETIC_NAME} recap="Since yesterday: two naps and a walk." />,
    );
    expect(screen.getByText('Since yesterday: two naps and a walk.')).toBeTruthy();
  });

  it('PUP-38-B shows a subtle text-free sync dot with an a11y label only while syncing', () => {
    const { rerender } = renderHeader(<DiaryHeader puppyName={SYNTHETIC_NAME} />);
    expect(screen.queryByTestId('diary-sync-indicator')).toBeNull();

    rerender(<AppProviders><DiaryHeader puppyName={SYNTHETIC_NAME} syncing /></AppProviders>);

    const indicator = screen.getByTestId('diary-sync-indicator');
    // Screen readers hear the status; sighted users see only a dot, no "Syncing" text.
    expect(indicator.props.accessibilityLabel).toBe(i18n.t('today.states.pending-write.status'));
    expect(screen.queryByText(i18n.t('today.states.pending-write.status'))).toBeNull();
  });

  it('PUP-38-B shows the sync dot even when no pet name (no avatar) is present', () => {
    renderHeader(<DiaryHeader syncing timeOfDay="midday" />);

    expect(screen.getByTestId('diary-sync-indicator')).toBeTruthy();
    expect(screen.queryByLabelText(SYNTHETIC_NAME)).toBeNull();
  });
});
