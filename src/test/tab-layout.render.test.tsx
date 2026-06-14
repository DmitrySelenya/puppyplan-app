import type { ReactNode } from 'react';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { primaryTabs, quickLogAction } from '@/contracts/navigation';
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
    tabBarAccessibilityLabel?: string;
    tabBarIcon?: (args: TabBarIconArgs) => ReactNode;
    title?: string;
  };
};

type TabScreenOptions = {
  tabBarActiveTintColor?: string;
  tabBarInactiveTintColor?: string;
};

const mockRouterPush = jest.fn();
const mockTabScreens: ScreenRegistration[] = [];
let mockScreenOptions: TabScreenOptions | undefined;
const mockReact = React;
const mockView = View;

jest.mock('expo-router', () => {
  function MockTabs({
    children,
    screenOptions,
  }: {
    children: ReactNode;
    screenOptions?: TabScreenOptions;
  }) {
    mockScreenOptions = screenOptions;
    return mockReact.createElement(mockView, { testID: 'tabs' }, children);
  }

  function MockTabsScreen(props: ScreenRegistration) {
    mockTabScreens.push(props);
    return null;
  }

  MockTabs.Screen = MockTabsScreen;

  return {
    router: {
      push: (href: string) => mockRouterPush(href),
    },
    Tabs: MockTabs,
  };
});

describe('TabLayout', () => {
  beforeEach(async () => {
    mockRouterPush.mockClear();
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
      expect(mockTabScreens.map((screen) => screen.name)).toEqual(
        primaryTabs.map((tab) => tab.routeName),
      );
    });
    expect(mockTabScreens.map((screen) => screen.options?.title)).toEqual(
      primaryTabs.map((tab) => i18n.t(tab.labelKey)),
    );
  });

  it('uses the primary/700 active tint and renders filled icons only for the focused tab', async () => {
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(mockTabScreens.length).toBe(primaryTabs.length);
    });

    expect(mockScreenOptions?.tabBarActiveTintColor).toBe(tokens.color.primary[700]);
    expect(mockScreenOptions?.tabBarInactiveTintColor).toBe(
      tokens.color.text.secondary,
    );

    for (const tabScreen of mockTabScreens) {
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

  it('keeps Quick Log as a persistent FAB that opens the modal route', async () => {
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    const quickLogButton = await waitFor(() => {
      return screen.getByRole('button', {
        name: i18n.t(quickLogAction.labelKey),
      });
    });

    expect(quickLogButton.props.accessibilityHint).toBe(
      i18n.t(quickLogAction.accessibilityHintKey),
    );

    fireEvent.press(quickLogButton);

    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith(quickLogAction.href);
  });

  it('positions Quick Log above the tab bar without covering tab hit areas on compact phones', async () => {
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    const quickLogButton = await waitFor(() => {
      return screen.getByRole('button', {
        name: i18n.t(quickLogAction.labelKey),
      });
    });

    const styleProp = quickLogButton.props.style;
    const flattenedStyle = StyleSheet.flatten(
      typeof styleProp === 'function' ? styleProp({ pressed: false }) : styleProp,
    );

    expect(flattenedStyle.position).toBe('absolute');
    expect(flattenedStyle.right).toBe(tokens.space[4]);
    expect(flattenedStyle.left).toBeUndefined();
    expect(flattenedStyle.marginLeft).toBeUndefined();
    expect(flattenedStyle.bottom).toBeGreaterThanOrEqual(
      tokens.layout.tabBarHeight +
        tokens.component.fab.size / 2 +
        tokens.layout.tapGapMin,
    );
  });
});
