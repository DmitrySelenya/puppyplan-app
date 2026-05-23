jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

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

afterAll(() => {
  jest.restoreAllMocks();
});
