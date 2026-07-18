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
    appleTeamId: 'JK68NGR7WD',
    bundleIdentifier: 'com.dmitry-selenya.puppyplan-app',
    supportsTablet: false,
  },
  android: {
    ...config.android,
    package: 'com.dmitry_selenya.puppyplan_app',
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    'expo-router',
    'expo-splash-screen',
    'expo-sqlite',
    'expo-secure-store',
    'expo-notifications',
    '@react-native-community/datetimepicker',
    './plugins/with-ios-privacy-manifest',
  ],
  experiments: {
    typedRoutes: true,
  },
});
