import { render, screen } from '@testing-library/react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash.js';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('highlights a grammar the host registered, not only the ones it bundles', () => {
    // bash is registered by the import above, onto the same Prism this component reads.
    render(<CodeBlock language="bash" code="echo hi" collapsible={false} />);
    const code = screen.getByText(/echo/).closest('code');
    expect(code?.querySelector('.token')).not.toBeNull();
  });

  it('falls back to plain text for a language nobody registered', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<CodeBlock language="brainfuck" code="+[-]" collapsible={false} />);

    // An unknown language is a missing grammar, not a broken component.
    expect(Prism.languages.brainfuck).toBeUndefined();
    expect(screen.getByText('+[-]')).toBeInTheDocument();
    warn.mockRestore();
  });
});
