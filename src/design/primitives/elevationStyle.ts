import type { ViewStyle } from 'react-native';

import { tokens } from '@/design/tokens';

type ElevationLevel = 1 | 2 | 3;

export function elevationStyle(level: ElevationLevel): ViewStyle {
  const elevation = tokens.elevation[level];

  return {
    elevation: elevation.androidElevation,
    shadowColor: elevation.color,
    shadowOffset: { height: elevation.y, width: elevation.x },
    shadowOpacity: elevation.opacity,
    shadowRadius: elevation.blur,
  };
}
