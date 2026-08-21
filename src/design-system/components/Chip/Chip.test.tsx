import { render, screen } from '@testing-library/react';
import { Warning } from '@phosphor-icons/react';
import { Chip } from './Chip';

describe('Chip', () => {
  it('gives the dismiss button a name', () => {
    render(<Chip color="red" label="Failed" onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('hides its icon from assistive technology', () => {
    // `label` names the chip, so the icon repeats it silently. As a child that
    // was every caller's job to say, and 20 of them had to.
    const { container } = render(<Chip color="red" icon={Warning} label="Degraded" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden');
  });

  it('keeps the name when the word is dropped', () => {
    const { container, rerender } = render(<Chip color="red" icon={Warning} label="Degraded" />);
    const cls = () => screen.getByText('Degraded').getAttribute('class') ?? '';
    expect(cls()).not.toMatch(/srOnly/);

    rerender(<Chip color="red" icon={Warning} label="Degraded" iconOnly />);
    // Hidden, not removed: the same call works in a wide row and a narrow one.
    expect(cls()).toMatch(/srOnly/);
    expect(container.textContent).toContain('Degraded');
  });

  it('stays silent when it has no label', () => {
    // A chip that is decoration beside text which already says it. Naming it
    // would make a screen reader read the same thing twice.
    const { container } = render(<Chip color="red" icon={Warning} />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden');
  });

  it('never emits the name as an attribute', () => {
    const { container } = render(<Chip color="red" icon={Warning} label="Degraded" iconOnly />);
    // aria-label is prohibited on a generic <span> and unreliably announced.
    // Hidden text is the only technique that works here, which is why the prop
    // is not called aria-label and must never be forwarded.
    expect(container.querySelector('[aria-label="Degraded"]')).toBeNull();
  });
});
