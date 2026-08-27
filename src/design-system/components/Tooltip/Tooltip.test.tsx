import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Tooltip from './Tooltip';
import * as Toolbar from '../Toolbar';
import { Button } from '../Button';

// Base UI reaches the component `render` returns through a ref, so a wrapper that cannot take one
// leaves the tooltip unanchored. React 19 passes ref as an ordinary prop and hides that; 18 does
// not, which is why the suite runs on both.
describe('Tooltip', () => {
  it('opens when its trigger is another component', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip.Provider>
        <Toolbar.Root aria-label="Actions">
          <Tooltip.Root>
            <Tooltip.Trigger render={<Toolbar.Button>Refresh</Toolbar.Button>} />
            <Tooltip.Popup>Reload the panel</Tooltip.Popup>
          </Tooltip.Root>
        </Toolbar.Root>
      </Tooltip.Provider>,
    );

    await user.hover(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Reload the panel')).toBeInTheDocument();
  });

  it('makes the popup the description of its trigger', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger render={<Button>Save</Button>} />
          <Tooltip.Popup>Writes the file to disk</Tooltip.Popup>
        </Tooltip.Root>
      </Tooltip.Provider>,
    );

    const trigger = screen.getByRole('button', { name: 'Save' });
    await user.hover(trigger);

    // The popup explains the control, so it has to be the control's description.
    const popup = await screen.findByRole('tooltip');
    expect(popup).toHaveTextContent('Writes the file to disk');
    expect(trigger).toHaveAttribute('aria-describedby', popup.id);
  });
});
