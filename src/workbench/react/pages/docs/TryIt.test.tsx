import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PanelContext, SDK_VERSION } from '@kbase/plugin-sdk';
import type { PanelHandle } from '@kbase/plugin-sdk';
import { testWorkbench } from '../../../../test/workbench';
import { WorkbenchProvider } from '../../WorkbenchProvider';
import { DocsDocument } from './Docs';

// CopyButton copies through this library; what it was handed is the skill.
const copy = vi.hoisted(() => vi.fn(() => true));
vi.mock('copy-to-clipboard', () => ({ default: copy }));

const panel = {
  id: 'docs/route',
  plugin: 'docs',
  kind: 'route',
  path: '/',
  focused: true,
  navigate: () => {},
  setTitle: () => {},
  setCrumbs: () => {},
  setTerms: () => {},
  subscribe: () => () => {},
} satisfies PanelHandle;

describe('Try making an app', () => {
  it('copies the page as a skill and offers the install form', async () => {
    const user = userEvent.setup();
    render(
      <WorkbenchProvider services={testWorkbench()}>
        <PanelContext.Provider value={panel}>
          <DocsDocument />
        </PanelContext.Provider>
      </WorkbenchProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Try making an app' }));
    await user.click(screen.getByRole('button', { name: 'Copy skill' }));

    const [skill] = copy.mock.calls[0] as unknown as [string];
    expect(skill.startsWith('---\nname: kbase-workbench-plugin\n')).toBe(true);
    expect(skill).toContain(`\`@kbase/plugin-sdk\` ${SDK_VERSION}`);
    expect(skill).toContain('## Plugin developer documentation');
    expect(skill).toContain('### Getting started');
    expect(skill).toContain('interface Manifest {');
    expect(skill).not.toContain('Try making an app');
    expect(screen.getByRole('textbox', { name: 'Manifest URL' })).toBeInTheDocument();
  });
});
