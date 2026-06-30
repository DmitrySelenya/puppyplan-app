import type { ReactNode } from 'react';
import * as React from 'react';
import { View } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

import { primaryTabs } from '@/contracts/navigation';
import { tokens } from '@/design/tokens';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import TabLayout from '../../app/(tabs)/_layout';

type TabBarIconArgs = {
  color: string;
  focused: boolean;
  size: number;
};

type ScreenRegistration = {
  name: string;
  options?: {
    href?: string | null;
    tabBarAccessibilityLabel?: string;
    tabBarIcon?: (args: TabBarIconArgs) => ReactNode;
    title?: string;
  };
};

type TabScreenOptions = {
  tabBarActiveTintColor?: string;
  tabBarInactiveTintColor?: string;
};

const mockCapsuleTabBar = jest.fn();
const mockTabScreens: ScreenRegistration[] = [];
let mockScreenOptions: TabScreenOptions | undefined;
const mockReact = React;
const mockView = View;

jest.mock('@/design/primitives/CapsuleTabBar', () => ({
  CapsuleTabBar: (props: unknown) => {
    mockCapsuleTabBar(props);
    return mockReact.createElement(mockView, { testID: 'capsule-tab-bar' });
  },
}));

jest.mock('expo-router', () => {
  function MockTabs({
    children,
    screenOptions,
    tabBar,
  }: {
    children: ReactNode;
    screenOptions?: TabScreenOptions;
    tabBar?: (props: unknown) => ReactNode;
  }) {
    mockScreenOptions = screenOptions;
    return mockReact.createElement(
      mockView,
      { testID: 'tabs' },
      children,
      tabBar?.({}),
    );
  }

  function MockTabsScreen(props: ScreenRegistration) {
    mockTabScreens.push(props);
    return null;
  }

  MockTabs.Screen = MockTabsScreen;

  return {
    Tabs: MockTabs,
  };
});

// Legacy redirect routes (today/index, health/index) are registered with
// `href: null` so they stay navigable for old links but never render as tabs.
// Assertions about the tab bar run against the visible set only.
const hiddenLegacyRoutes = ['today/index', 'health/index'];

function visibleTabScreens() {
  return mockTabScreens.filter((tabScreen) => tabScreen.options?.href !== null);
}

describe('TabLayout', () => {
  beforeEach(async () => {
    mockCapsuleTabBar.mockClear();
    mockTabScreens.length = 0;
    mockScreenOptions = undefined;
    await i18n.changeLanguage('en');
  });

  it('renders only the primary tab screens from the navigation contract', async () => {
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(visibleTabScreens().map((screen) => screen.name)).toEqual(
        primaryTabs.map((tab) => tab.routeName),
      );
    });
    expect(visibleTabScreens().map((screen) => screen.options?.title)).toEqual(
      primaryTabs.map((tab) => i18n.t(tab.labelKey)),
    );

    // Legacy redirect routes must be registered but hidden from the tab bar.
    const hidden = mockTabScreens.filter(
      (tabScreen) => tabScreen.options?.href === null,
    );
    expect(hidden.map((tabScreen) => tabScreen.name).sort()).toEqual(
      [...hiddenLegacyRoutes].sort(),
    );
  });

  it('maps V2 primary tabs to the canonical Diary, Pet, and More icons', async () => {
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(visibleTabScreens().length).toBe(primaryTabs.length);
    });

    const iconNameByRoute = Object.fromEntries(
      visibleTabScreens().map((tabScreen) => {
        const icon = tabScreen.options?.tabBarIcon?.({
          color: tokens.color.text.secondary,
          focused: false,
          size: 24,
        });

        return [
          tabScreen.name,
          React.isValidElement<{ name?: string }>(icon) ? icon.props.name : null,
        ];
      }),
    );

    expect(iconNameByRoute).toEqual({
      'diary/index': 'book',
      'pet/index': 'paw',
      'more/index': 'more',
    });
  });

  it('uses the primary/700 active tint and renders filled icons only for the focused tab', async () => {
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(visibleTabScreens().length).toBe(primaryTabs.length);
    });

    expect(mockScreenOptions?.tabBarActiveTintColor).toBe(tokens.color.primary[700]);
    expect(mockScreenOptions?.tabBarInactiveTintColor).toBe(
      tokens.color.text.secondary,
    );

    for (const tabScreen of visibleTabScreens()) {
      const renderIcon = tabScreen.options?.tabBarIcon;
      expect(renderIcon).toBeDefined();

      const focused = render(
        <>{renderIcon?.({ color: tokens.color.primary[700], focused: true, size: 24 })}</>,
      );
      const focusedTree = JSON.stringify(focused.toJSON());
      expect(focusedTree).toContain('"stroke":"none"');
      expect(focusedTree).toContain(`"fill":"${tokens.color.primary[700]}"`);
      focused.unmount();

      const unfocused = render(
        <>{renderIcon?.({ color: tokens.color.text.secondary, focused: false, size: 24 })}</>,
      );
      const unfocusedTree = JSON.stringify(unfocused.toJSON());
      expect(unfocusedTree).toContain('"fill":"none"');
      expect(unfocusedTree).toContain(`"stroke":"${tokens.color.text.secondary}"`);
      unfocused.unmount();
    }
  });

  it('delegates bottom navigation chrome to CapsuleTabBar', async () => {
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(visibleTabScreens().length).toBe(primaryTabs.length);
    });
    expect(screen.getByTestId('capsule-tab-bar')).toBeTruthy();
    expect(mockCapsuleTabBar).toHaveBeenCalledTimes(1);
  });
});
