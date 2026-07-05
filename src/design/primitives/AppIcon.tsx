import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { decorativeViewProps } from '@/design/a11y';
import { tokens } from '@/design/tokens';

export type AppIconName =
  | 'ball'
  | 'bell'
  | 'bellSlash'
  | 'book'
  | 'bowl'
  | 'calendar'
  | 'check'
  | 'chevronRight'
  | 'close'
  | 'docText'
  | 'gear'
  | 'heart'
  | 'home'
  | 'infoCircle'
  | 'lock'
  | 'moon'
  | 'more'
  | 'paw'
  | 'personCluster'
  | 'plus'
  | 'poop'
  | 'pottyInside'
  | 'search'
  | 'sliders'
  | 'spark'
  | 'stethoscope'
  | 'today'
  | 'trash'
  | 'trainingPaw'
  | 'vaccine'
  | 'walk'
  | 'warningTriangle'
  | 'weight'
  | 'water';

export type AppIconProps = {
  color?: string;
  filled?: boolean;
  name: AppIconName;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Glyph geometry ported from the v1 design icon library
// (docs/design/v1/raw/icons.jsx): linear 24x24, stroke 1.75, rounded.
const iconShapes: Record<AppIconName, React.JSX.Element> = {
  // Play ball: circle with two curved seams.
  ball: (
    <>
      <Circle cx={12} cy={12} r={8} />
      <Path d="M5 9c4.5 2.5 9.5 2.5 14 0M5 15c4.5-2.5 9.5-2.5 14 0M12 4c-2.2 4.5-2.2 11.5 0 16" />
    </>
  ),
  bell: <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" />,
  // Bell with a diagonal "muted" slash across it.
  bellSlash: (
    <>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" />
      <Path d="M4 4l16 16" />
    </>
  ),
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
  check: <Path d="M5 12.5l4.2 4.2L19 7" />,
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  docText: (
    <>
      <Path d="M7 3h7l4 4v14H7V3zM14 3v5h5" />
      <Path d="M10 12h6M10 16h5" />
    </>
  ),
  gear: (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.1L14 3h-4l-.5 2.8a7 7 0 0 0-2 1.1l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.1L10 21h4l.5-2.8a7 7 0 0 0 2-1.1l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
    </>
  ),
  heart: (
    <Path d="M3.5 9.5C3.5 6.7 5.6 4.5 8.4 4.5c1.9 0 3 1 3.6 2 .6-1 1.7-2 3.6-2 2.8 0 4.9 2.2 4.9 5 0 4.7-8.5 9.5-8.5 9.5S3.5 14.2 3.5 9.5z" />
  ),
  home: (
    <>
      <Path d="M4 11l8-7 8 7" />
      <Path d="M6.5 10.5V20h11v-9.5" />
      <Path d="M10 20v-5h4v5" />
    </>
  ),
  infoCircle: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 11v5M12 8h.01" />
    </>
  ),
  lock: (
    <>
      <Rect height={10} rx={2} width={14} x={5} y={10} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
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
  paw: (
    <>
      <Circle cx={7.5} cy={9} r={1.8} />
      <Circle cx={12} cy={7} r={1.8} />
      <Circle cx={16.5} cy={9} r={1.8} />
      <Path d="M7 17c0-2.4 2.2-4.5 5-4.5s5 2.1 5 4.5c0 1.5-1 2.5-2.3 2.5-.9 0-1.6-.4-2.7-.4s-1.8.4-2.7.4C8 19.5 7 18.5 7 17z" />
    </>
  ),
  personCluster: (
    <>
      <Circle cx={9} cy={8} r={3} />
      <Path d="M4 20a5 5 0 0 1 10 0" />
      <Circle cx={17} cy={9} r={2.5} />
      <Path d="M15 15.5a4.5 4.5 0 0 1 5 4.5" />
    </>
  ),
  poop: (
    <Path d="M8 11a3 3 0 0 1 1.5-5.5c.7-1.5 3-1.5 3.5 0a3 3 0 0 1 3 4 3 3 0 0 1 .5 5.5H7a3 3 0 0 1 1-4z" />
  ),
  // Indoor "pee pad" tray: rounded rectangle with a small centered top tab.
  pottyInside: (
    <>
      <Rect height={12} rx={2.5} width={15} x={4.5} y={7} />
      <Path d="M10 7V5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V7" />
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={6} />
      <Path d="M20 20l-4.5-4.5" />
    </>
  ),
  sliders: (
    <>
      <Path d="M4 7h5M15 7h5M4 17h9M19 17h1" />
      <Circle cx={12} cy={7} r={3} />
      <Circle cx={16} cy={17} r={3} />
    </>
  ),
  spark: (
    <Path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" />
  ),
  stethoscope: (
    <>
      <Path d="M6 4v5a4 4 0 0 0 8 0V4" />
      <Path d="M10 13v2a4 4 0 0 0 8 0v-1" />
      <Circle cx={18} cy={13} r={2} />
    </>
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
  trainingPaw: (
    <>
      <Path d="M5 16l4-4 3 3 7-7" />
      <Path d="M5 20h14" />
      <Circle cx={7.5} cy={7.5} r={1.5} />
      <Circle cx={11.5} cy={6} r={1.5} />
      <Circle cx={15.5} cy={7.5} r={1.5} />
    </>
  ),
  vaccine: (
    <>
      <Path d="M15 4l5 5M17.5 6.5L8 16" />
      <Path d="M6 14l4 4M5 19l3-3M12 8l4 4" />
    </>
  ),
  // Walk: two offset footprint pads (a step trail).
  walk: (
    <>
      <Path d="M8 4c-1.4 0-2.3 1.6-2.3 4.1S6.6 12 8 12s2-1.4 2-3.9S9.4 4 8 4z" />
      <Path d="M16 10c-1.4 0-2.3 1.6-2.3 4.1S14.6 18 16 18s2-1.4 2-3.9S17.4 10 16 10z" />
    </>
  ),
  warningTriangle: (
    <>
      <Path d="M12 4l9 16H3L12 4z" />
      <Path d="M12 9v4M12 16h.01" />
    </>
  ),
  weight: (
    <>
      <Path d="M6 8h12l2 12H4L6 8z" />
      <Path d="M9 8a3 3 0 0 1 6 0" />
      <Path d="M10 14h4" />
    </>
  ),
  water: <Path d="M12 3.5C9 7.5 6 11 6 14a6 6 0 0 0 12 0c0-3-3-6.5-6-10.5z" />,
};

// Filled silhouettes used for the active tab-bar state (the design atlas shows
// a solid tinted glyph for the focused tab). Only the nav icons are provided;
// other names fall back to their stroked glyph.
const filledIconShapes: Partial<Record<AppIconName, React.JSX.Element>> = {
  book: (
    <>
      <Path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4z" />
      <Path d="M20 4h-3a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h4V4z" />
    </>
  ),
  today: <Circle cx={12} cy={12} r={8.5} />,
  paw: (
    <>
      <Circle cx={7.5} cy={9} r={2.1} />
      <Circle cx={12} cy={7} r={2.1} />
      <Circle cx={16.5} cy={9} r={2.1} />
      <Path d="M7 17c0-2.4 2.2-4.5 5-4.5s5 2.1 5 4.5c0 1.5-1 2.5-2.3 2.5-.9 0-1.6-.4-2.7-.4s-1.8.4-2.7.4C8 19.5 7 18.5 7 17z" />
    </>
  ),
  heart: (
    <Path d="M3.5 9.5C3.5 6.7 5.6 4.5 8.4 4.5c1.9 0 3 1 3.6 2 .6-1 1.7-2 3.6-2 2.8 0 4.9 2.2 4.9 5 0 4.7-8.5 9.5-8.5 9.5S3.5 14.2 3.5 9.5z" />
  ),
  more: (
    <>
      <Circle cx={6} cy={12} r={1.9} />
      <Circle cx={12} cy={12} r={1.9} />
      <Circle cx={18} cy={12} r={1.9} />
    </>
  ),
};

export function AppIcon({
  color = tokens.color.text.primary,
  filled = false,
  name,
  size = 22,
  style,
  testID,
}: AppIconProps) {
  const filledShape = filled ? filledIconShapes[name] : undefined;

  if (filledShape) {
    return (
      <Svg
        {...decorativeViewProps}
        fill={color}
        height={size}
        testID={testID}
        stroke="none"
        style={style}
        viewBox="0 0 24 24"
        width={size}>
        {filledShape}
      </Svg>
    );
  }

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
