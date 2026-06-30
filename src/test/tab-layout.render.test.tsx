import type { ReactNode } from 'react';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { primaryTabs, quickLogAction } from '@/contracts/navigation';
import { useSnackbar } from '@/design/primitives/Snackbar';
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

const mockRouterPush = jest.fn();
const mockTabScreens: ScreenRegistration[] = [];
let mockScreenOptions: TabScreenOptions | undefined;
let mockPathname = '/diary';
const mockReact = React;
const mockView = View;

function ActiveSnackbarProbe() {
  const snackbar = useSnackbar();

  React.useEffect(() => {
    snackbar.showSnackbar({
      accessibilityLabel: 'Saved.',
      id: 'tab-layout-fab-policy',
      message: 'Saved',
      tone: 'success',
    });
  }, [snackbar]);

  return null;
}

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
    usePathname: () => mockPathname,
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
    mockRouterPush.mockClear();
    mockTabScreens.length = 0;
    mockScreenOptions = undefined;
    mockPathname = '/diary';
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

  it('limits the Quick Log FAB to Diary and Pet log surfaces and hides it while snackbar is active', async () => {
    mockPathname = '/more';

    const more = render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(visibleTabScreens().length).toBe(primaryTabs.length);
    });
    expect(screen.queryByRole('button', {
      name: i18n.t(quickLogAction.labelKey),
    })).toBeNull();
    more.unmount();

    mockPathname = '/pet';
    render(
      <AppProviders>
        <TabLayout />
      </AppProviders>,
    );

    expect(await screen.findByRole('button', {
      name: i18n.t(quickLogAction.labelKey),
    })).toBeTruthy();
  });

  it('hides the Quick Log FAB while a snackbar is active', async () => {
    mockPathname = '/diary';

    render(
      <AppProviders>
        <TabLayout />
        <ActiveSnackbarProbe />
      </AppProviders>,
    );

    expect(await screen.findByText('Saved')).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t(quickLogAction.labelKey),
    })).toBeNull();
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
