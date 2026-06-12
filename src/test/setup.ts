import { act } from '@testing-library/react-native';
import { notifyManager } from '@tanstack/query-core';

jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const originalConsoleInfo = console.info;

jest.spyOn(console, 'info').mockImplementation((message?: unknown, ...optionalParams: unknown[]) => {
  if (
    typeof message === 'string' &&
    message.includes('i18next') &&
    message.includes('Locize')
  ) {
    return;
  }

  originalConsoleInfo(message, ...optionalParams);
});

notifyManager.setNotifyFunction((callback) => {
  act(callback);
});

afterAll(() => {
  jest.restoreAllMocks();
});
