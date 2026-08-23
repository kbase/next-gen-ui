import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';
import styles from './Alert.module.scss';

const glyph = (container: HTMLElement) => container.querySelector(`.${styles.icon} svg`);

describe('Alert', () => {
  it('carries a shape for its color, so severity is not color alone', () => {
    for (const color of ['green', 'primary', 'yellow', 'red'] as const) {
      const { container, unmount } = render(<Alert color={color}>Message</Alert>);
      expect(glyph(container)).toBeInTheDocument();
      unmount();
    }
  });

  it('prefers a given icon over the default', () => {
    const { container } = render(
      <Alert color="red" icon={<span data-testid="mine" />}>
        Message
      </Alert>,
    );
    expect(screen.getByTestId('mine')).toBeInTheDocument();
    expect(glyph(container)).not.toBeInTheDocument();
  });

  it('drops the icon when passed null', () => {
    const { container } = render(
      <Alert color="red" icon={null}>
        Message
      </Alert>,
    );
    expect(container.querySelector(`.${styles.icon}`)).not.toBeInTheDocument();
  });

  it('is an alert when red and a status otherwise', () => {
    const { unmount } = render(<Alert color="red">Failed</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    unmount();

    render(<Alert color="green">Done</Alert>);
    expect(screen.getByRole('status')).toHaveTextContent('Done');
  });
});
