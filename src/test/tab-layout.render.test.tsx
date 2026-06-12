import type { ReactNode } from 'react';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { primaryTabs, quickLogAction } from '@/contracts/navigation';
import { tokens } from '@/design/tokens';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import TabLayout from '../../app/(tabs)/_layout';

type ScreenRegistration = {
  name: string;
  options?: {
    tabBarAccessibilityLabel?: string;
    title?: string;
  };
};

const mockRouterPush = jest.fn();
const mockTabScreens: ScreenRegistration[] = [];
const mockReact = React;
const mockView = View;

jest.mock('expo-router', () => {
  function MockTabs({ children }: { children: ReactNode }) {
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

  it('positions Quick Log above tab hit areas on compact phones', async () => {
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
    expect(flattenedStyle.right).toBeUndefined();
    expect(flattenedStyle.left).toBe('50%');
    expect(flattenedStyle.marginLeft).toBe(-tokens.component.fab.size / 2);
    expect(flattenedStyle.bottom).toBeGreaterThanOrEqual(
      tokens.layout.tabBarHeight + tokens.space[8],
    );
  });
});
