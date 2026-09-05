import { configure, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { createWorkbench } from '../host';
import { WorkbenchProvider } from './WorkbenchProvider';
import { Workbench } from './Workbench';

// Lazy plugin modules and route loaders both run before a panel appears;
// under a loaded test run that exceeds the 1s default.
configure({ asyncUtilTimeout: 5000 });

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

function mount(storage: Storage | null = null) {
  const services = createWorkbench({
    installed: localPlugins,
    storage,
    defaultPinned: ['koros', 'data', 'jobs'],
    defaultAssistant: 'koros',
  });
  render(
    <WorkbenchProvider services={services}>
      <Workbench />
    </WorkbenchProvider>,
  );
  return services;
}

const status = () => screen.getByRole('status', { name: 'Workbench announcements' });
const openJob = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  const sidebar = screen.getByRole('region', { name: 'Sidebar' });
  await user.click(await within(sidebar).findByRole('button', { name }));
};

describe('Workbench', () => {
  it('shows the pinned navigators and opens a document from one', async () => {
    const user = userEvent.setup();
    mount();
    const sidebar = screen.getByRole('region', { name: 'Sidebar' });
    expect(
      within(sidebar)
        .getAllByRole('region')
        .map((r) => r.getAttribute('aria-labelledby')),
    ).toHaveLength(3);
    await openJob(user, /assemble reads/i);
    expect(await screen.findByRole('tab', { name: /job 12/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { name: /assemble reads/i })).toBeInTheDocument();
    expect(status()).toHaveTextContent('Opened Jobs: 12');
  });

  it('opening the same document again focuses it instead of duplicating', async () => {
    const user = userEvent.setup();
    mount();
    await openJob(user, /assemble reads/i);
    await openJob(user, /annotate isolate/i);
    await openJob(user, /assemble reads/i);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /job 12/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('closes the focused panel from the keyboard and announces it', async () => {
    const user = userEvent.setup();
    mount();
    await openJob(user, /assemble reads/i);
    await screen.findByRole('heading', { name: /assemble reads/i });
    await user.keyboard('{Alt>}{Shift>}W{/Shift}{/Alt}');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(status()).toHaveTextContent('Closed Job 12: Assemble reads');
  });

  it('splits and moves focus by keyboard', async () => {
    const user = userEvent.setup();
    mount();
    await openJob(user, /assemble reads/i);
    await openJob(user, /annotate isolate/i);
    await screen.findByRole('heading', { name: /annotate isolate/i });
    await user.keyboard('{Control>}{Alt>}{Shift>}{ArrowRight}{/Shift}{/Alt}{/Control}');
    expect(screen.getAllByRole('tablist', { name: 'Open panels' })).toHaveLength(2);
    expect(status()).toHaveTextContent(
      'Moved Job 13: Annotate isolate 12 right of Job 12: Assemble reads',
    );
    await user.keyboard('{Alt>}{Shift>}{ArrowUp}{/Shift}{/Alt}');
    expect(screen.getByRole('tab', { name: /job 12/i })).toHaveFocus();
  });

  it('restores the layout from storage on the next mount', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const first = mount(storage);
    await openJob(user, /nifh search/i);
    expect(Object.keys(first.store.get().panels)).toContain('jobs/document?id=20');

    document.body.innerHTML = '';
    mount(storage);
    expect(await screen.findByRole('tab', { name: /job 20/i })).toBeInTheDocument();
  });

  it('keeps the rest interactive when a panel crashes', async () => {
    const user = userEvent.setup();
    mount();
    await openJob(user, /assemble reads/i);
    const sidebar = screen.getByRole('region', { name: 'Sidebar' });
    // The Tree's click handler sits on the row inside the treeitem.
    await user.click(await within(sidebar).findByText('Crash test panel'));
    expect(await screen.findByRole('alert')).toHaveTextContent('This panel crashed');
    await user.click(screen.getByRole('tab', { name: /job 12/i }));
    expect(screen.getByRole('heading', { name: /assemble reads/i })).toBeVisible();
  });

  it('runs a plugin command from the prompt bar, loading the plugin on demand', async () => {
    const user = userEvent.setup();
    const services = mount();
    expect(services.source.loaded('jobs')).toBeUndefined();
    await user.type(screen.getByRole('combobox', { name: 'Prompt' }), '/cancel 12{Enter}');
    await openJob(user, /assemble reads/i);
    expect(await screen.findByText('cancelled')).toBeInTheDocument();
  });

  it('completes a command name, then opens a document cold with /open', async () => {
    const user = userEvent.setup();
    const services = mount();
    const box = screen.getByRole('combobox', { name: 'Prompt' });
    await user.type(box, '/op');
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('/open <plugin> [value]')]),
    );
    await user.keyboard('{Tab}');
    expect(box).toHaveValue('/open ');
    // Not pinned, so nothing of it has loaded yet.
    expect(services.source.loaded('function-junction')).toBeUndefined();
    await user.type(box, 'function-junction{Enter}');
    expect(await screen.findByRole('tab', { name: /function junction/i })).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'Function Junction' })).toBeInTheDocument();
    expect(services.source.loaded('function-junction')).toBeDefined();
  });

  it('sends free text to the assistant and lands it in an arc', async () => {
    const user = userEvent.setup();
    mount();
    await user.type(
      screen.getByRole('combobox', { name: 'Prompt' }),
      'Which isolates fix nitrogen?{Enter}',
    );
    expect(await screen.findByRole('tab', { name: /arc: nitrogenase/i })).toBeInTheDocument();
    expect(await screen.findByText('Which isolates fix nitrogen?')).toBeInTheDocument();
  });

  it('with no assistant, free text is refused and the setting re-targets the bar', async () => {
    const user = userEvent.setup();
    const services = mount();
    services.settings.set({ assistant: null });
    await user.type(screen.getByRole('combobox', { name: 'Prompt' }), 'hello?{Enter}');
    expect(status()).toHaveTextContent('No assistant is set');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    services.settings.set({ assistant: 'koros' });
    await user.clear(screen.getByRole('combobox', { name: 'Prompt' }));
    await user.type(screen.getByRole('combobox', { name: 'Prompt' }), 'hello?{Enter}');
    expect(await screen.findByRole('tab', { name: /arc:/i })).toBeInTheDocument();
  });

  it('a locked layout refuses rearrangement but keeps opening and closing free', async () => {
    const user = userEvent.setup();
    const services = mount();
    await openJob(user, /assemble reads/i);
    await user.type(screen.getByRole('combobox', { name: 'Prompt' }), '/lock-layout{Enter}');
    expect(services.store.get().locked).toBe(true);
    // Twice: the status bar note and the live-region announcement.
    expect((await screen.findAllByText('Layout locked')).length).toBeGreaterThan(0);

    // Structural: refused.
    services.dispatch({ type: 'pin', plugin: 'catalog' });
    expect(services.store.get().sidebar.pinned).not.toContain('catalog');

    // Usage: still free.
    await user.type(screen.getByRole('combobox', { name: 'Prompt' }), '/close{Enter}');
    expect(screen.queryByRole('tab', { name: /job 12/i })).not.toBeInTheDocument();

    await user.type(screen.getByRole('combobox', { name: 'Prompt' }), '/lock-layout{Enter}');
    expect(services.store.get().locked).toBe(false);
    services.dispatch({ type: 'pin', plugin: 'catalog' });
    expect(services.store.get().sidebar.pinned).toContain('catalog');
  });

  it('shows a loaded plugin status item', async () => {
    const user = userEvent.setup();
    mount();
    await openJob(user, /assemble reads/i);
    expect(await screen.findByText(/1 running/)).toBeInTheDocument();
  });
});
