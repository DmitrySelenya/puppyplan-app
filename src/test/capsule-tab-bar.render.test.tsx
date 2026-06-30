import * as React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { primaryTabs, quickLogAction, scheduleAction } from '@/contracts/navigation';
import { tokens } from '@/design/tokens';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import {
  CapsuleTabBar,
  type CapsuleTabBarProps,
} from '@/design/primitives/CapsuleTabBar';

const mockNavigate = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockRouterPush(href) },
}));

function makeTabBarProps(focusedIndex = 0): CapsuleTabBarProps {
  const routes = primaryTabs.map((tab, index) => ({
    key: `${tab.routeName}-${index}`,
    name: tab.routeName,
  }));

  return {
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) => mockNavigate(name),
    },
    state: {
      index: focusedIndex,
      routes,
    },
  };
}

function renderBar(focusedIndex = 0) {
  return render(
    <AppProviders>
      <CapsuleTabBar {...makeTabBarProps(focusedIndex)} />
    </AppProviders>,
  );
}

describe('CapsuleTabBar', () => {
  beforeEach(async () => {
    mockNavigate.mockClear();
    mockRouterPush.mockClear();
    await i18n.changeLanguage('en');
  });

  it('renders exactly three tabs in one tablist and Add outside it', () => {
    renderBar();

    expect(screen.getByRole('tablist')).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.props.accessibilityState?.selected)).toEqual([
      true,
      false,
      false,
    ]);

    const add = screen.getByRole('button', { name: i18n.t('tabs.add') });
    expect(add).toBeTruthy();
    expect(add.props.accessibilityRole).not.toBe('tab');
  });

  it('renders a detached capsule, not a full-width bar', () => {
    renderBar();

    const capsule = screen.getByTestId('nav-capsule');
    const style = StyleSheet.flatten(capsule.props.style);

    expect(style.alignSelf).toBe('center');
    expect(style.backgroundColor).toBe(tokens.color.surface.raised);
    expect(style.borderRadius).toBe(tokens.radius.full);
    expect(style.elevation).toBe(tokens.elevation[2].androidElevation);
    expect(style.left).toBeUndefined();
    expect(style.right).toBeUndefined();
  });

  it('opens the chooser and morphs Add into a close control', () => {
    renderBar();

    expect(screen.queryByTestId('nav-chooser')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.getByTestId('nav-chooser')).toBeTruthy();
    expect(screen.queryByRole('button', { name: i18n.t('tabs.add') })).toBeNull();
    expect(screen.getByRole('button', { name: i18n.t('tabs.add-close') })).toBeTruthy();
  });

  it('removes the three-tab capsule while the chooser is open', () => {
    renderBar();

    expect(screen.getByTestId('nav-capsule')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.queryByTestId('nav-capsule')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('shows a scrim, a drag handle, and two slabs; scrim tap closes', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.getByTestId('nav-scrim')).toBeTruthy();
    expect(screen.getByTestId('nav-drag-handle')).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('nav.quick-log-slab') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('nav.schedule-slab') })).toBeTruthy();

    fireEvent.press(screen.getByTestId('nav-scrim'));

    expect(screen.queryByTestId('nav-chooser')).toBeNull();
    expect(screen.getByTestId('nav-capsule')).toBeTruthy();
  });

  it('routes Quick Log and Schedule slabs to their destinations', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('nav.quick-log-slab') }));

    expect(mockRouterPush).toHaveBeenCalledWith(quickLogAction.href);
    expect(screen.queryByTestId('nav-chooser')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('nav.schedule-slab') }));

    expect(mockRouterPush).toHaveBeenCalledWith(scheduleAction.href);
  });

  it('navigates to a tab route via the navigation prop on press', () => {
    renderBar();

    fireEvent.press(screen.getByRole('tab', { name: i18n.t(primaryTabs[1].labelKey) }));

    expect(mockNavigate).toHaveBeenCalledWith(primaryTabs[1].routeName);
  });
});
