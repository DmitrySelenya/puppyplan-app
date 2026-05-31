import { render, screen } from '@testing-library/react-native';

import { TextField } from '@/design/primitives/TextField';

describe('TextField', () => {
  it('renders the label and uses it as the input accessibility label', () => {
    render(<TextField label="Email" value="" onChangeText={() => {}} />);

    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('shows error text and marks the field invalid when errorText is set', () => {
    render(
      <TextField
        errorText="Enter a valid email address."
        label="Email"
        value="x"
        onChangeText={() => {}}
      />,
    );

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.accessibilityState).toMatchObject({
      invalid: true,
    });
  });
});
