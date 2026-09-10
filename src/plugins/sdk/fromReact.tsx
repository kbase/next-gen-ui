import { Component } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@kbase/design-system';
import { HostContext } from './host';
import type { Mount } from './modules';
import { PanelContext } from './panel';

// A React component as a panel body. React is the plugin's choice, not the
// host's: the host hands over an element and a handle, and this puts a
// React root in the element with the SDK contexts around the component.
// The tree is drawn again whenever the handle reports a change — the path,
// the focus — so `usePanel()` reads the current value on every render.
export function fromReact(Component: ComponentType): { mount: Mount } {
  return {
    mount(el, { panel, host }) {
      const root = createRoot(el);
      const draw = () =>
        root.render(
          // A snapshot rather than the live handle: context consumers compare
          // the value by identity, and a fresh object is what makes a path
          // change reach them.
          <PanelContext value={{ ...panel, path: panel.path, focused: panel.focused }}>
            <HostContext value={host}>
              <Fence>
                <Component />
              </Fence>
            </HostContext>
          </PanelContext>,
        );
      draw();
      const stop = panel.subscribe(draw);
      return () => {
        stop();
        // The host tears panels down from its own commit phase, and a root
        // cannot be unmounted while another is mid-render; the next tick is
        // after that commit.
        setTimeout(() => root.unmount(), 0);
      };
    },
  };
}

// A crash stays inside the panel: the tab, its neighbours and the chrome
// keep working, and the panel offers to try again.
class Fence extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 'var(--s-5)', display: 'grid', gap: 'var(--s-3)' }}>
        <p className="body">This panel crashed.</p>
        <p className="caption">{this.state.error.message}</p>
        <div>
          <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
