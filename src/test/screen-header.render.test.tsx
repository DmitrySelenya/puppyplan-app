import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/design/primitives/Button';
import { ScreenHeader } from '@/design/primitives/ScreenHeader';
import { MIN_TOUCH_TARGET } from '@/design/a11y';
import { tokens } from '@/design/tokens';

describe('ScreenHeader primitive', () => {
  it('renders a centered title using the nav-title type scale', () => {
    render(<ScreenHeader title="Puppy profile" />);

    const title = screen.getByRole('header', { name: 'Puppy profile' });
    const titleStyle = StyleSheet.flatten(title.props.style);

    expect(title).toBeTruthy();
    expect(titleStyle.textAlign).toBe('center');
    expect(titleStyle.fontSize).toBe(tokens.typography.scale.title1.fontSize);
    expect(titleStyle.fontWeight).toBe('600');
  });

  it('renders a back control that fires onBack and exposes an accessible label', () => {
    const onBack = jest.fn();

    render(
      <ScreenHeader
        backLabel="More"
        onBack={onBack}
        title="Quick trackers"
      />,
    );

    const backControl = screen.getByRole('button', { name: 'More' });
    const backStyle = StyleSheet.flatten(backControl.props.style);

    expect(backStyle.minHeight).toBe(MIN_TOUCH_TARGET);

    fireEvent.press(backControl);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('requires callers to provide a localized back label with back controls', () => {
    const invalidHeader = (
      // @ts-expect-error ScreenHeader back controls require a localized backLabel.
      <ScreenHeader onBack={jest.fn()} title="Settings" />
    );

    expect(invalidHeader).toBeTruthy();
  });

  it('renders a trailing action node', () => {
    const onSave = jest.fn();

    render(
      <ScreenHeader
        title="Edit profile"
        trailing={<Button label="Save" onPress={onSave} variant="tertiary" />}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });

    expect(saveButton).toBeTruthy();

    fireEvent.press(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
