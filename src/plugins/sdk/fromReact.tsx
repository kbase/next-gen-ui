import { Component } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { Alert, Button } from '@kbase/design-system';
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
          // A snapshot rather than the live handle: the spread reads the
          // handle's `path` and `focused` getters, and context consumers
          // compare the value by identity, so a fresh object per draw is what
          // makes a path change reach them.
          <PanelContext value={{ ...panel }}>
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

  // Clearing the error draws the children again inside the root this fence
  // is already in: the plugin's `mount` and its React root both survive, so
  // only the component below starts over.
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Alert
        color="red"
        trace={this.state.error.message}
        actions={
          <Button variant="link" size="sm" onClick={() => this.setState({ error: null })}>
            <ArrowCounterClockwise size={12} /> Try again
          </Button>
        }
      >
        <strong>This panel crashed.</strong>
      </Alert>
    );
  }
}
