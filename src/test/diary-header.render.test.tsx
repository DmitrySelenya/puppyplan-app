import * as React from 'react';
import { render, screen } from '@testing-library/react-native';

import { DiaryHeader } from '@/features/today/components/DiaryHeader';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

const SYNTHETIC_NAME = 'Mochi';

function renderHeader(node: React.ReactElement) {
  return render(<AppProviders>{node}</AppProviders>);
}

describe('DiaryHeader', () => {
  beforeEach(async () => {
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
});
