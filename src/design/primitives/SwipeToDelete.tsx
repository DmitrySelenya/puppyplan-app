import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { AppIcon } from '@/design/primitives/AppIcon';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

const ACTION_WIDTH = 72;

export type SwipeToDeleteProps = {
  children: ReactNode;
  deleteLabel: string;
  onDelete: () => void;
  testID?: string;
};

/** Reveals a destructive delete action behind a row on left-swipe. The
 * revealed action is hidden from the accessibility tree while closed (it's
 * off-screen, not just visually covered) — screen-reader users delete via
 * the caller-provided accessibility action instead, since swipe gestures
 * are not reliably discoverable via VoiceOver/TalkBack. */
export function SwipeToDelete({ children, deleteLabel, onDelete, testID }: SwipeToDeleteProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Swipeable
      onSwipeableClose={() => {
        setIsOpen(false);
      }}
      onSwipeableOpen={() => {
        setIsOpen(true);
      }}
      overshootRight={false}
      renderRightActions={() => (
        <Touchable
          accessibilityElementsHidden={!isOpen}
          accessibilityLabel={deleteLabel}
          accessibilityRole="button"
          importantForAccessibility={isOpen ? 'yes' : 'no-hide-descendants'}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
          style={styles.action}
          testID={testID}>
          <AppIcon
            color={tokens.color.text.onPrimary}
            name="trash"
            size={22}
          />
        </Touchable>
      )}
      ref={swipeableRef}
      rightThreshold={40}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: tokens.color.status.danger,
    borderRadius: tokens.radius.card,
    justifyContent: 'center',
    marginLeft: tokens.space[3],
    width: ACTION_WIDTH,
  },
});
