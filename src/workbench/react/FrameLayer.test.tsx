import { act, configure, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRef } from 'react';
import { AppFrame, defineRoute, fromReact } from '@kbase/plugin-sdk';
import type { GroupId } from '../core';
import { groups, makeRoute } from '../core';
import { noPersistence } from '../host';
import { createWorkbench } from '../compose';
import { localPlugin } from '../host/local';
import { WorkbenchProvider } from './WorkbenchProvider';
import { Workbench } from './Workbench';

configure({ asyncUtilTimeout: 5000 });

// A page holding an app frame, which records the element its ref is handed.
const seen: HTMLIFrameElement[] = [];
function App() {
  const frame = useRef<HTMLIFrameElement>(null);
  return (
    <div data-testid="around">
      <AppFrame
        ref={(el) => {
          frame.current = el;
          if (el && !seen.includes(el)) seen.push(el);
        }}
        src="about:blank"
        title="An app"
      />
    </div>
  );
}

function mount() {
  const services = createWorkbench({
    installed: [
      localPlugin({
        config: { id: 'app', title: 'App' },
        route: () =>
          Promise.resolve(defineRoute({ ...fromReact(App), normalize: (p) => p })),
      }),
    ],
    persistence: noPersistence,
    defaultAssistant: 'none',
    defaultIntent: 'none',
  });
  render(
    <WorkbenchProvider services={services}>
      <Workbench />
    </WorkbenchProvider>,
  );
  return services;
}

const mainGroups = (services: ReturnType<typeof mount>): GroupId[] =>
  groups(services.store.get().main).map((g) => g.id);

describe('an app frame', () => {
  it('is one element in the frame layer, handed to the page, and kept across a move', async () => {
    seen.length = 0;
    const services = mount();
    const page = makeRoute('app', '/', 'a');
    const other = makeRoute('app', '/two', 'b');
    act(() => {
      services.dispatch({ type: 'open', panel: page });
      services.dispatch({ type: 'open', panel: other });
    });
    await screen.findAllByTestId('around');
    const container = services.frames.container;
    await waitFor(() => expect(container.querySelectorAll('iframe')).toHaveLength(2));
    const [frame] = container.querySelectorAll('iframe');
    // In the layer, not in the panel; the panel holds the box it is laid over.
    expect(screen.getAllByTestId('around')[0].querySelector('iframe')).toBeNull();
    expect(frame).toHaveAttribute('title', 'An app');
    expect(seen).toContain(frame);

    // A split moves the page's panel to a new group; the frame is the same
    // element in the same place, so its document is untouched.
    const [root] = mainGroups(services);
    act(() => {
      services.dispatch({ type: 'move', panel: page.id, to: { group: root, side: 'right' } });
    });
    await waitFor(() => expect(mainGroups(services)).toHaveLength(2));
    expect(container.querySelectorAll('iframe')[0]).toBe(frame);
    expect(frame.isConnected).toBe(true);
    expect(seen).toHaveLength(2);

    // Closing the panel takes its frame with it.
    act(() => {
      services.dispatch({ type: 'close', panel: page.id });
    });
    await waitFor(() => expect(container.querySelectorAll('iframe')).toHaveLength(1));
  });
});
