import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import * as Toolbar from '../Toolbar';

// These run on React 19, where a function component receives `ref` as a normal prop, so the
// React 18 failure cannot be reproduced here. Both versions require the ref to reach the DOM
// element, which is what these tests check.
describe('Button', () => {
  it('forwards its ref to the rendered button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Publish</Button>);
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Publish' }));
  });

  it('registers with Toolbar.Root, which renders it and needs its ref to do so', () => {
    render(
      <Toolbar.Root aria-label="Actions">
        <Toolbar.Button>Refresh</Toolbar.Button>
        <Toolbar.Button>Copy</Toolbar.Button>
      </Toolbar.Root>,
    );
    // Base UI assigns a roving tabindex only to items it has registered, and it registers
    // them using the ref it passes to `render`.
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveAttribute('tabindex', '-1');
  });
});
