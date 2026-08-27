import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';
import * as Toast from './Toast';
import styles from './Toast.module.scss';
import { useToastManager } from './useToastManager';

function Fixture({ onUndo }: { onUndo?: () => void }) {
  const toasts = useToastManager();
  return (
    <Button
      onClick={() =>
        toasts.add({
          title: 'Moved to Archive',
          description: 'The arc is hidden from the other scopes.',
          ...(onUndo ? { actionProps: { children: 'Undo', onClick: onUndo } } : {}),
        })
      }
    >
      Archive
    </Button>
  );
}

const open = async (props: { onUndo?: () => void } = {}) => {
  const user = userEvent.setup();
  render(
    <Toast.Provider>
      <Fixture {...props} />
      <Toast.Viewport />
    </Toast.Provider>,
  );
  await user.click(screen.getByRole('button', { name: 'Archive' }));
  return user;
};

describe('Toast', () => {
  it('runs the action it was given', async () => {
    const undo = vi.fn();
    const user = await open({ onUndo: undo });

    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledOnce();
  });

  it('names the control that dismisses it, once that control is reachable', async () => {
    await open();
    const toast = await screen.findByRole('dialog');
    // Base UI keeps this aria-hidden until the viewport is expanded or it takes focus, so focus
    // is the only state in which the name can be computed.
    const close = toast.querySelector<HTMLElement>(`.${styles.close}`)!;
    close.focus();
    expect(await screen.findByRole('button', { name: 'Close' })).toBe(close);
  });

  it('shows no action when it was given none', async () => {
    await open();
    // The action element renders nothing when the toast has none.
    const toast = await screen.findByRole('dialog');
    expect(toast.querySelector(`.${styles.action}`)).toBeNull();
  });
});
