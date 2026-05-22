import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PuppyPlan',
  slug: 'puppyplan-app',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'puppyplan',
  userInterfaceStyle: 'light',
  ios: {
    ...config.ios,
    supportsTablet: false,
  },
  android: {
    ...config.android,
    predictiveBackGestureEnabled: true,
  },
  plugins: ['expo-router', 'expo-splash-screen'],
  experiments: {
    typedRoutes: true,
  },
});
