import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { decorativeViewProps } from '@/design/a11y';
import { tokens } from '@/design/tokens';

export type AppIconName =
  | 'bell'
  | 'book'
  | 'bowl'
  | 'calendar'
  | 'chevronRight'
  | 'heart'
  | 'moon'
  | 'more'
  | 'plus'
  | 'poop'
  | 'search'
  | 'spark'
  | 'today'
  | 'trash'
  | 'water';

export type AppIconProps = {
  color?: string;
  name: AppIconName;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Glyph geometry ported from the v1 design icon library
// (docs/design/v1/raw/icons.jsx): linear 24x24, stroke 1.75, rounded.
const iconShapes: Record<AppIconName, React.JSX.Element> = {
  bell: <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" />,
  book: (
    <Path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4zM20 4h-3a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h4V4z" />
  ),
  bowl: (
    <>
      <Path d="M3 11h18M5 11l1.5 7a2 2 0 0 0 2 1.5h7a2 2 0 0 0 2-1.5L19 11" />
      <Path d="M9 8c0-1.5 1.3-3 3-3s3 1.5 3 3" />
    </>
  ),
  calendar: (
    <>
      <Rect height={13} rx={2} width={16} x={4} y={6} />
      <Path d="M9 6V4M15 6V4" />
    </>
  ),
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  heart: (
    <Path d="M3.5 9.5C3.5 6.7 5.6 4.5 8.4 4.5c1.9 0 3 1 3.6 2 .6-1 1.7-2 3.6-2 2.8 0 4.9 2.2 4.9 5 0 4.7-8.5 9.5-8.5 9.5S3.5 14.2 3.5 9.5z" />
  ),
  moon: <Path d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  more: (
    <>
      <Circle cx={6} cy={12} r={1.5} />
      <Circle cx={12} cy={12} r={1.5} />
      <Circle cx={18} cy={12} r={1.5} />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  poop: (
    <Path d="M8 11a3 3 0 0 1 1.5-5.5c.7-1.5 3-1.5 3.5 0a3 3 0 0 1 3 4 3 3 0 0 1 .5 5.5H7a3 3 0 0 1 1-4z" />
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={6} />
      <Path d="M20 20l-4.5-4.5" />
    </>
  ),
  spark: (
    <Path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" />
  ),
  today: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  trash: (
    <Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  ),
  water: <Path d="M12 3.5C9 7.5 6 11 6 14a6 6 0 0 0 12 0c0-3-3-6.5-6-10.5z" />,
};

export function AppIcon({
  color = tokens.color.text.primary,
  name,
  size = 22,
  style,
  testID,
}: AppIconProps) {
  return (
    <Svg
      {...decorativeViewProps}
      fill="none"
      height={size}
      testID={testID}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      style={style}
      viewBox="0 0 24 24"
      width={size}>
      {iconShapes[name]}
    </Svg>
  );
}
