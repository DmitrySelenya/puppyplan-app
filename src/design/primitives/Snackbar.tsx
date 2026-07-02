import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { decorativeViewProps } from '@/design/a11y';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { haptic, type DesignHapticEvent } from '@/design/haptics';
import { tokens } from '@/design/tokens';

export type SnackbarTone = 'success' | 'error' | 'warning' | 'info';

export type SnackbarAction = Readonly<{
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
}>;

export type SnackbarMessage = Readonly<{
  accessibilityLabel: string;
  clientEventId?: string;
  durationMs?: number;
  hapticEvent?: DesignHapticEvent;
  id: string;
  message: string;
  primaryAction?: SnackbarAction;
  secondaryAction?: SnackbarAction;
  tone: SnackbarTone;
}>;

export type SnackbarController = Readonly<{
  dismissSnackbar: (id?: string) => void;
  replaceSnackbar: (message: SnackbarMessage) => void;
  showSnackbar: (message: SnackbarMessage) => void;
}>;

const SnackbarContext = createContext<SnackbarController | null>(null);
const SnackbarActivityContext = createContext(false);
export const SNACKBAR_DEFAULT_DURATION_MS = 4_000;
export const SNACKBAR_BOTTOM_OFFSET_WITH_FAB = tokens.layout.bottomInsetFab;

export function SnackbarProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState<SnackbarMessage | null>(null);
  const messageRef = useRef<SnackbarMessage | null>(null);

  const showSnackbar = useCallback((nextMessage: SnackbarMessage) => {
    messageRef.current = nextMessage;
    triggerSnackbarHaptic(nextMessage);
    setMessage(nextMessage);
  }, []);

  const replaceSnackbar = useCallback((nextMessage: SnackbarMessage) => {
    const currentMessage = messageRef.current;

    if (currentMessage && currentMessage.id !== nextMessage.id) {
      return;
    }

    messageRef.current = nextMessage;
    triggerSnackbarHaptic(nextMessage);
    setMessage(nextMessage);
  }, []);

  const dismissSnackbar = useCallback((id?: string) => {
    const currentMessage = messageRef.current;

    if (!currentMessage || (id !== undefined && currentMessage.id !== id)) {
      return;
    }

    messageRef.current = null;
    setMessage((currentMessage) => {
      if (!currentMessage || (id !== undefined && currentMessage.id !== id)) {
        return currentMessage;
      }

      return null;
    });
  }, []);

  const controller = useMemo<SnackbarController>(() => ({
    dismissSnackbar,
    replaceSnackbar,
    showSnackbar,
  }), [dismissSnackbar, replaceSnackbar, showSnackbar]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      if (messageRef.current?.id === message.id) {
        messageRef.current = null;
      }
      setMessage((currentMessage) =>
        currentMessage?.id === message.id ? null : currentMessage);
    }, message.durationMs ?? SNACKBAR_DEFAULT_DURATION_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [message]);

  return (
    <SnackbarContext.Provider value={controller}>
      <SnackbarActivityContext.Provider value={message !== null}>
        <View
          style={styles.providerRoot}
          testID="snackbar-provider-root">
          {children}
          <SnackbarHost message={message} />
        </View>
      </SnackbarActivityContext.Provider>
    </SnackbarContext.Provider>
  );
}

function triggerSnackbarHaptic(message: SnackbarMessage): void {
  if (message.hapticEvent) {
    void haptic(message.hapticEvent);
  }
}

export function useSnackbar(): SnackbarController {
  const controller = useContext(SnackbarContext);

  if (controller === null) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }

  return controller;
}

export function useSnackbarActive(): boolean {
  return useContext(SnackbarActivityContext);
}

function SnackbarHost({ message }: { message: SnackbarMessage | null }) {
  const insets = useSafeAreaInsets();

  if (!message) {
    return null;
  }

  const toneStyle = snackbarToneStylesByTone[message.tone];

  return (
      <View
        pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: SNACKBAR_BOTTOM_OFFSET_WITH_FAB + insets.bottom,
        },
      ]}
      testID="snackbar-host">
      <View
        style={[
          styles.surface,
          toneStyle.surface,
        ]}
        testID="snackbar-surface">
        <View
          accessibilityLabel={message.accessibilityLabel}
          accessibilityLiveRegion="polite"
          accessible
          style={styles.status}
          testID="snackbar-status">
          <View
            {...decorativeViewProps}
            style={styles.icon}
            testID="snackbar-tone-icon">
            <AppText
              maxFontSizeMultiplier={1.6}
              style={toneStyle.icon}
              variant="headline">
              {snackbarIcons[message.tone]}
            </AppText>
          </View>
          <AppText
            style={[styles.message, toneStyle.message]}
            variant="callout">
            {message.message}
          </AppText>
        </View>
        {message.primaryAction ? (
          <SnackbarActionButton
            action={message.primaryAction}
            style={toneStyle.action}
          />
        ) : null}
        {message.secondaryAction ? (
          <SnackbarActionButton
            action={message.secondaryAction}
            style={toneStyle.action}
          />
        ) : null}
      </View>
    </View>
  );
}

function SnackbarActionButton({
  action,
  style,
}: {
  action: SnackbarAction;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Button
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      label={action.label}
      onPress={action.onPress}
      style={[styles.action, style]}
      variant="tertiary"
    />
  );
}

const styles = StyleSheet.create({
  action: {
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
  },
  providerRoot: {
    flex: 1,
  },
  host: {
    bottom: 0,
    left: 0,
    paddingHorizontal: tokens.layout.screenPaddingPhone,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.layout.tapGapMin * 3,
    minWidth: tokens.layout.tapGapMin * 3,
  },
  message: {
    flex: 1,
  },
  surface: {
    ...elevationStyle(1),
    alignItems: 'center',
    borderRadius: tokens.component.snackbar.radius,
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  status: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: tokens.space[2],
  },
});

const snackbarIcons = {
  error: '!',
  info: 'i',
  success: '+',
  warning: '!',
} as const satisfies Record<SnackbarTone, string>;

const toneStyles = StyleSheet.create({
  errorAction: {
    backgroundColor: tokens.color.status.dangerTint,
  },
  errorIcon: {
    color: tokens.color.pill.failed.text,
  },
  errorMessage: {
    color: tokens.color.pill.failed.text,
  },
  errorSurface: {
    backgroundColor: tokens.color.status.dangerTint,
  },
  infoAction: {
    backgroundColor: tokens.color.status.infoTint,
  },
  infoIcon: {
    color: tokens.color.status.info,
  },
  infoMessage: {
    color: tokens.color.status.info,
  },
  infoSurface: {
    backgroundColor: tokens.color.status.infoTint,
  },
  successAction: {
    backgroundColor: tokens.color.status.successTint,
  },
  successIcon: {
    color: tokens.color.status.success,
  },
  successMessage: {
    color: tokens.color.status.success,
  },
  successSurface: {
    backgroundColor: tokens.color.status.successTint,
  },
  warningAction: {
    backgroundColor: tokens.color.status.warningTint,
  },
  warningIcon: {
    color: tokens.color.status.warning,
  },
  warningMessage: {
    color: tokens.color.status.warning,
  },
  warningSurface: {
    backgroundColor: tokens.color.status.warningTint,
  },
});

const snackbarToneStylesByTone: Record<
  SnackbarTone,
  {
    action: ViewStyle;
    icon: TextStyle;
    message: TextStyle;
    surface: ViewStyle;
  }
> = {
  error: {
    action: toneStyles.errorAction,
    icon: toneStyles.errorIcon,
    message: toneStyles.errorMessage,
    surface: toneStyles.errorSurface,
  },
  info: {
    action: toneStyles.infoAction,
    icon: toneStyles.infoIcon,
    message: toneStyles.infoMessage,
    surface: toneStyles.infoSurface,
  },
  success: {
    action: toneStyles.successAction,
    icon: toneStyles.successIcon,
    message: toneStyles.successMessage,
    surface: toneStyles.successSurface,
  },
  warning: {
    action: toneStyles.warningAction,
    icon: toneStyles.warningIcon,
    message: toneStyles.warningMessage,
    surface: toneStyles.warningSurface,
  },
};
