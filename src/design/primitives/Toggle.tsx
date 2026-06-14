import { Switch } from 'react-native';

import { tokens } from '@/design/tokens';

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export function Toggle({
  accessibilityLabel,
  disabled = false,
  onValueChange,
  testID,
  value,
}: ToggleProps) {
  return (
    <Switch
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      disabled={disabled}
      ios_backgroundColor={tokens.color.surface.sunken}
      onValueChange={onValueChange}
      testID={testID}
      thumbColor={tokens.color.surface.raised}
      trackColor={{
        false: tokens.color.surface.sunken,
        true: tokens.color.primary[600],
      }}
      value={value}
    />
  );
}
