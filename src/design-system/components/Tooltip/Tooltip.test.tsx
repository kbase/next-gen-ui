import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Tooltip from './Tooltip';
import * as Toolbar from '../Toolbar';

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
});
