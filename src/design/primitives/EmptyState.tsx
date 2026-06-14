import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { AppText } from '@/design/primitives/AppText';
import { Button, type ButtonProps } from '@/design/primitives/Button';
import { Stack } from '@/design/primitives/Stack';
import { tokens } from '@/design/tokens';

type EmptyStateAction = Pick<ButtonProps, 'accessibilityHint' | 'disabled' | 'label' | 'onPress'>;

export type EmptyStateProps = {
  body: string;
  icon?: ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  title: string;
};

export function EmptyState({
  body,
  icon,
  primaryAction,
  secondaryAction,
  style,
  testID,
  title,
}: EmptyStateProps) {
  return (
    <View
      style={[styles.root, style]}
      testID={testID}>
      {icon ? (
        <View
          {...decorativeViewProps}
          style={styles.iconFrame}>
          {icon}
        </View>
      ) : null}
      <Stack
        align="center"
        gap="xs">
        <AppText
          accessibilityRole="header"
          style={styles.title}
          variant="title3">
          {title}
        </AppText>
        <AppText
          style={styles.body}
          tone="secondary"
          variant="subheadline">
          {body}
        </AppText>
      </Stack>
      {primaryAction || secondaryAction ? (
        <Stack
          align="stretch"
          gap="sm"
          style={styles.actions}>
          {primaryAction ? (
            <Button
              {...primaryAction}
              variant="primary"
            />
          ) : null}
          {secondaryAction ? (
            <Button
              {...secondaryAction}
              variant="tertiary"
            />
          ) : null}
        </Stack>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignSelf: 'stretch',
  },
  body: {
    textAlign: 'center',
  },
  iconFrame: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.lg,
    height: 120,
    justifyContent: 'center',
    width: 160,
  },
  root: {
    alignItems: 'center',
    gap: tokens.space[4],
    paddingHorizontal: tokens.layout.cardPadding,
    paddingVertical: tokens.space[8],
  },
  title: {
    textAlign: 'center',
  },
});
